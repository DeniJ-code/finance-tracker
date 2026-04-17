jest.mock('@/lib/db', () => ({
  db: {
    category: {
      findFirst: jest.fn().mockResolvedValue({ id: 'cat_1', userId: 'user_1' }),
    },
    dailyExpense: {
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ userId: 'user_1' }),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { createDailyExpense, deleteDailyExpense } from '@/app/(app)/daily/actions'
import { db } from '@/lib/db'

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe('createDailyExpense', () => {
  it('creates expense for authenticated user', async () => {
    await createDailyExpense(
      makeFormData({ amount: '12.50', categoryId: 'cat_1', note: 'lunch', currency: 'EUR' })
    )
    expect(db.dailyExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        amount: 12.5,
        categoryId: 'cat_1',
        note: 'lunch',
        source: 'web',
      }),
    })
  })

  it('throws for invalid amount', async () => {
    await expect(
      createDailyExpense(makeFormData({ amount: '-5', categoryId: 'cat_1' }))
    ).rejects.toThrow('Invalid amount')
  })

  it('throws when category is missing', async () => {
    await expect(
      createDailyExpense(makeFormData({ amount: '10', categoryId: '' }))
    ).rejects.toThrow('Category required')
  })
})

describe('deleteDailyExpense', () => {
  it('deletes expense for current user', async () => {
    await deleteDailyExpense('expense_1')
    expect(db.dailyExpense.deleteMany).toHaveBeenCalledWith({
      where: { id: 'expense_1', userId: 'user_1' },
    })
  })
})
