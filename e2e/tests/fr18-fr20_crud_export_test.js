Feature('FR-18/19/20 CRUD and export')

Scenario('creates, edits, exports, and deletes recurring-account resources', async ({ I }) => {
  await I.amOnPage('/login')
  const result = await I.executeScript(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const request = async (path, options = {}) => {
      const response = await fetch(`/v1${path}`, {
        credentials: 'include',
        headers: { 'content-type': 'application/json', ...(options.headers || {}) },
        ...options,
      })
      if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status}`)
      return response
    }
    const json = async (path, options) => request(path, options).then((response) => response.json())
    const today = new Date().toISOString().slice(0, 10)

    await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `fr18-${suffix}@example.test`,
        password: 'Password123',
        name: 'FR18 E2E',
      }),
    })
    const categoryList = await json('/categories?type=expense')
    if (!categoryList.items.length) throw new Error('expected default expense categories')
    const category = await json('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: `E2E category ${suffix}`, type: 'expense' }),
    })
    const wallet = await json('/wallets', {
      method: 'POST',
      body: JSON.stringify({ name: `E2E wallet ${suffix}`, initialBalance: 0 }),
    })
    const budget = await json('/budgets', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: category.id,
        month: today.slice(0, 7),
        amountLimit: 1000,
      }),
    })
    const recurring = await json('/recurring', {
      method: 'POST',
      body: JSON.stringify({
        walletId: wallet.id,
        categoryId: category.id,
        amount: 250,
        frequency: 'daily',
        startOn: today,
      }),
    })
    const transaction = await json('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        walletId: wallet.id,
        categoryId: category.id,
        amount: 250,
        occurredOn: today,
      }),
    })

    const editedWallet = await json(`/wallets/${wallet.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: `Edited wallet ${suffix}` }),
    })
    const editedCategory = await json(`/categories/${category.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: `Edited category ${suffix}` }),
    })
    const editedBudget = await json(`/budgets/${budget.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ amountLimit: 2000 }),
    })
    const editedRecurring = await json(`/recurring/${recurring.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ amount: 300 }),
    })
    const editedTransaction = await json(`/transactions/${transaction.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ note: 'edited by E2E' }),
    })
    const exportResponse = await request('/transactions/export')
    const csv = await exportResponse.text()

    await request(`/transactions/${transaction.id}`, { method: 'DELETE' })
    await request(`/recurring/${recurring.id}`, { method: 'DELETE' })
    await request(`/budgets/${budget.id}`, { method: 'DELETE' })
    await request(`/wallets/${wallet.id}`, { method: 'DELETE' })
    await request(`/categories/${category.id}`, { method: 'DELETE' })

    return {
      created: [category.id, wallet.id, budget.id, recurring.id, transaction.id].every(Boolean),
      edited: [
        editedWallet.name,
        editedCategory.name,
        editedBudget.amountLimit,
        editedRecurring.amount,
        editedTransaction.note,
      ].every(Boolean),
      csvHeader: csv.split('\r\n')[0],
    }
  })

  await I.assertEqual(result.created, true)
  await I.assertEqual(result.edited, true)
  await I.assertEqual(result.csvHeader, 'date,type,category,wallet,amount,note')
})
