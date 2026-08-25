import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

async function createWallet(
  cookie: string,
  overrides: Partial<{
    name: string
    initialBalance: number
    note: string | null
  }> = {},
) {
  return SELF.fetch(
    authedJsonRequest(cookie, '/v1/wallets', {
      method: 'POST',
      body: {
        name: overrides.name ?? 'Ví chính',
        initialBalance: overrides.initialBalance ?? 100_000,
        note: overrides.note,
      },
    }),
  )
}

describe('Wallet CRUD', () => {
  it('creates a wallet', async () => {
    const { cookie } = await registerUser()

    const response = await createWallet(cookie, {
      name: 'Ví tiền mặt',
      initialBalance: 50_000,
      note: 'Tiền mặt',
    })

    expect(response.status).toBe(201)

    const wallet = (await response.json()) as {
      id: string
      name: string
      initialBalance: number
      currentBalance: number
      totalIncome: number
      totalExpense: number
      note: string | null
    }

    expect(wallet.name).toBe('Ví tiền mặt')
    expect(wallet.initialBalance).toBe(50_000)
    expect(wallet.currentBalance).toBe(50_000)
    expect(wallet.totalIncome).toBe(0)
    expect(wallet.totalExpense).toBe(0)
    expect(wallet.note).toBe('Tiền mặt')
  })

  it('lists wallets', async () => {
    const { cookie } = await registerUser()

    const created = await createWallet(cookie, {
      name: 'Ví danh sách',
    })

    expect(created.status).toBe(201)

    const response = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/wallets', {
        method: 'GET',
      }),
    )

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      items: { id: string; name: string }[]
    }

    expect(body.items.some((wallet) => wallet.name === 'Ví danh sách')).toBe(true)
  })

  it('gets a wallet by id', async () => {
    const { cookie } = await registerUser()

    const created = await createWallet(cookie, {
      name: 'Ví chi tiết',
    })

    const { id } = (await created.json()) as { id: string }

    const response = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/wallets/${id}`, {
        method: 'GET',
      }),
    )

    expect(response.status).toBe(200)

    const wallet = (await response.json()) as {
      id: string
      name: string
    }

    expect(wallet.id).toBe(id)
    expect(wallet.name).toBe('Ví chi tiết')
  })

  it('updates a wallet', async () => {
    const { cookie } = await registerUser()

    const created = await createWallet(cookie, {
      name: 'Ví cũ',
      initialBalance: 100_000,
    })

    const { id } = (await created.json()) as { id: string }

    const response = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/wallets/${id}`, {
        method: 'PATCH',
        body: {
          name: 'Ví mới',
          initialBalance: 200_000,
          note: 'Đã cập nhật',
        },
      }),
    )

    expect(response.status).toBe(200)

    const wallet = (await response.json()) as {
      name: string
      initialBalance: number
      currentBalance: number
      note: string | null
    }

    expect(wallet.name).toBe('Ví mới')
    expect(wallet.initialBalance).toBe(200_000)
    expect(wallet.currentBalance).toBe(200_000)
    expect(wallet.note).toBe('Đã cập nhật')
  })

  it('deletes a wallet without transactions', async () => {
    const { cookie } = await registerUser()

    const created = await createWallet(cookie, {
      name: 'Ví cần xoá',
    })

    const { id } = (await created.json()) as { id: string }

    const response = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/wallets/${id}`, {
        method: 'DELETE',
      }),
    )

    expect(response.status).toBe(204)

    const getResponse = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/wallets/${id}`, {
        method: 'GET',
      }),
    )

    expect(getResponse.status).toBe(404)
  })
})

describe('Wallet validation and business rules', () => {
  it('rejects duplicate active wallet name', async () => {
    const { cookie } = await registerUser()

    await createWallet(cookie, {
      name: 'Ví trùng tên',
    })

    const response = await createWallet(cookie, {
      name: 'Ví trùng tên',
    })

    expect(response.status).toBe(409)

    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(body.error.code).toBe('DUPLICATE_NAME')
  })

  it('rejects negative initial balance', async () => {
    const { cookie } = await registerUser()

    const response = await createWallet(cookie, {
      initialBalance: -1,
    })

    expect(response.status).toBe(400)

    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(body.error.code).toBe('VALIDATION')
  })
})

describe('Wallet security', () => {
  it('does not allow another user to get the wallet', async () => {
    const owner = await registerUser()
    const otherUser = await registerUser()

    const created = await createWallet(owner.cookie, {
      name: 'Ví riêng tư',
    })

    const { id } = (await created.json()) as { id: string }

    const response = await SELF.fetch(
      authedJsonRequest(otherUser.cookie, `/v1/wallets/${id}`, {
        method: 'GET',
      }),
    )

    expect(response.status).toBe(404)

    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('does not allow another user to update or delete the wallet', async () => {
    const owner = await registerUser()
    const otherUser = await registerUser()

    const created = await createWallet(owner.cookie, {
      name: 'Ví của owner',
    })

    const { id } = (await created.json()) as { id: string }

    const patchResponse = await SELF.fetch(
      authedJsonRequest(otherUser.cookie, `/v1/wallets/${id}`, {
        method: 'PATCH',
        body: {
          name: 'Ví bị đổi',
        },
      }),
    )

    expect(patchResponse.status).toBe(404)

    const deleteResponse = await SELF.fetch(
      authedJsonRequest(otherUser.cookie, `/v1/wallets/${id}`, {
        method: 'DELETE',
      }),
    )

    expect(deleteResponse.status).toBe(404)
  })
})

describe('Wallet archive', () => {
  it('archives a wallet and hides it from the default list', async () => {
    const { cookie } = await registerUser()

    const created = await createWallet(cookie, {
      name: 'Ví lưu trữ',
    })

    const { id } = (await created.json()) as { id: string }

    const archiveResponse = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/wallets/${id}/archive`, {
        method: 'POST',
      }),
    )

    expect(archiveResponse.status).toBe(200)

    const defaultListResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/wallets', {
        method: 'GET',
      }),
    )

    const defaultList = (await defaultListResponse.json()) as {
      items: { id: string }[]
    }

    expect(defaultList.items.some((wallet) => wallet.id === id)).toBe(false)

    const archivedListResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/wallets?includeArchived=true', {
        method: 'GET',
      }),
    )

    const archivedList = (await archivedListResponse.json()) as {
      items: { id: string }[]
    }

    expect(archivedList.items.some((wallet) => wallet.id === id)).toBe(true)
  })

  it('cannot unarchive when the wallet name has been reused', async () => {
    const { cookie } = await registerUser()

    const created = await createWallet(cookie, {
      name: 'Ví du lịch',
    })

    const { id } = (await created.json()) as { id: string }

    const archiveResponse = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/wallets/${id}/archive`, {
        method: 'POST',
      }),
    )

    expect(archiveResponse.status).toBe(200)

    const recreated = await createWallet(cookie, {
      name: 'Ví du lịch',
    })

    expect(recreated.status).toBe(201)

    const unarchiveResponse = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/wallets/${id}/unarchive`, {
        method: 'POST',
      }),
    )

    expect(unarchiveResponse.status).toBe(409)

    const body = (await unarchiveResponse.json()) as {
      error: { code: string }
    }

    expect(body.error.code).toBe('DUPLICATE_NAME')
  })
})
