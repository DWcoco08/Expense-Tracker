import { SELF } from 'cloudflare:test'
import { LOGIN_ATTEMPT_LIMIT } from '@expense/shared'
import { describe, expect, it } from 'vitest'
import { cookieHeaderFrom, jsonRequest, registerUser, uniqueEmail } from './helpers'

describe('POST /v1/auth/register', () => {
  it('creates a user and never leaks the password hash', async () => {
    const email = uniqueEmail()
    const response = await SELF.fetch(
      jsonRequest('/v1/auth/register', {
        method: 'POST',
        body: { name: 'Nguyen Van A', email, password: 'Password123' },
      }),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as { user: Record<string, unknown> }
    expect(body.user.email).toBe(email)
    expect(body.user).not.toHaveProperty('passwordHash')
    expect(cookieHeaderFrom(response)).toContain('at=')
  })

  it('rejects a second registration with the same email (EMAIL_TAKEN)', async () => {
    const { input } = await registerUser()

    const response = await SELF.fetch(
      jsonRequest('/v1/auth/register', { method: 'POST', body: input }),
    )

    expect(response.status).toBe(409)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('EMAIL_TAKEN')
  })

  it('rejects a password without a digit (VALIDATION, not a 500)', async () => {
    const response = await SELF.fetch(
      jsonRequest('/v1/auth/register', {
        method: 'POST',
        body: { name: 'Test', email: uniqueEmail(), password: 'onlyletters' },
      }),
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION')
  })
})

describe('POST /v1/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const { input } = await registerUser()

    const response = await SELF.fetch(
      jsonRequest('/v1/auth/login', {
        method: 'POST',
        body: { email: input.email, password: input.password },
      }),
    )

    expect(response.status).toBe(200)
    expect(cookieHeaderFrom(response)).toContain('at=')
  })

  it('returns the same error for a wrong password and for an unknown email', async () => {
    const { input } = await registerUser()

    const wrongPassword = await SELF.fetch(
      jsonRequest('/v1/auth/login', {
        method: 'POST',
        body: { email: input.email, password: 'WrongPassword1' },
      }),
    )
    const unknownEmail = await SELF.fetch(
      jsonRequest('/v1/auth/login', {
        method: 'POST',
        body: { email: uniqueEmail(), password: 'WrongPassword1' },
      }),
    )

    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    const wrongBody = (await wrongPassword.json()) as { error: { code: string } }
    const unknownBody = (await unknownEmail.json()) as { error: { code: string } }
    expect(wrongBody.error.code).toBe('INVALID_CREDENTIALS')
    expect(unknownBody.error.code).toBe('INVALID_CREDENTIALS')
  })

  // LOGIN_ATTEMPT_LIMIT kiểm tra recentFailures >= limit TRƯỚC khi xác thực mật khẩu,
  // nên biên đúng là: đủ (limit) lần thất bại trước đó thì lần kế tiếp mới bị chặn.
  it(`rate-limits after ${LOGIN_ATTEMPT_LIMIT} failed attempts from the same email`, async () => {
    const { input } = await registerUser()
    const attemptLogin = () =>
      SELF.fetch(
        jsonRequest('/v1/auth/login', {
          method: 'POST',
          body: { email: input.email, password: 'WrongPassword1' },
        }),
      )

    for (let i = 0; i < LOGIN_ATTEMPT_LIMIT; i++) {
      const response = await attemptLogin()
      expect(response.status).toBe(401)
    }

    const blocked = await attemptLogin()
    expect(blocked.status).toBe(429)
    const body = (await blocked.json()) as { error: { code: string } }
    expect(body.error.code).toBe('RATE_LIMITED')
  })
})

describe('session handling', () => {
  it('rejects a protected route with no session cookie (401, not 403/404)', async () => {
    const response = await SELF.fetch(new Request('https://api.test/v1/wallets'))

    expect(response.status).toBe(401)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHENTICATED')
  })

  it('accepts a protected route with a valid session cookie', async () => {
    const { cookie } = await registerUser()

    const response = await SELF.fetch(
      new Request('https://api.test/v1/wallets', { headers: { cookie } }),
    )

    expect(response.status).toBe(200)
  })

  it('rotates the refresh token and rejects the old one after use (BR-16)', async () => {
    const { cookie } = await registerUser()

    const firstRefresh = await SELF.fetch(
      new Request('https://api.test/v1/auth/refresh', { method: 'POST', headers: { cookie } }),
    )
    expect(firstRefresh.status).toBe(200)

    const secondRefresh = await SELF.fetch(
      new Request('https://api.test/v1/auth/refresh', { method: 'POST', headers: { cookie } }),
    )
    expect(secondRefresh.status).toBe(401)
  })

  it('invalidates the refresh token on logout', async () => {
    const { cookie } = await registerUser()

    const logout = await SELF.fetch(
      new Request('https://api.test/v1/auth/logout', { method: 'POST', headers: { cookie } }),
    )
    expect(logout.status).toBe(204)

    const refreshAfterLogout = await SELF.fetch(
      new Request('https://api.test/v1/auth/refresh', { method: 'POST', headers: { cookie } }),
    )
    expect(refreshAfterLogout.status).toBe(401)
  })
})
