import { SELF } from 'cloudflare:test'

const BASE_URL = 'https://api.test'

export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${crypto.randomUUID()}@example.test`
}

type JsonInit = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export function jsonRequest(path: string, init: JsonInit = {}) {
  const { body, headers, ...rest } = init

  return new Request(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function authedJsonRequest(cookie: string, path: string, init: JsonInit = {}) {
  return jsonRequest(path, {
    ...init,
    headers: {
      ...init.headers,
      cookie,
    },
  })
}

export function cookieHeaderFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((raw) => raw.split(';')[0])
    .join('; ')
}

interface RegisteredUser {
  cookie: string
  user: {
    id: string
    email: string
    name: string
  }
  input: {
    name: string
    email: string
    password: string
  }
}

export async function registerUser(
  overrides: Partial<{
    name: string
    email: string
    password: string
  }> = {},
): Promise<RegisteredUser> {
  const input = {
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? 'Password123',
  }

  const response = await SELF.fetch(
    jsonRequest('/v1/auth/register', {
      method: 'POST',
      body: input,
    }),
  )

  if (response.status !== 201) {
    throw new Error(`registerUser failed: ${response.status} ${await response.text()}`)
  }

  const cookie = cookieHeaderFrom(response)

  const { user } = (await response.json()) as {
    user: RegisteredUser['user']
  }

  return {
    cookie,
    user,
    input,
  }
}
