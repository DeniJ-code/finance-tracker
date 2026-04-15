jest.mock('@/lib/db', () => ({
  db: {
    category: {
      count: jest.fn(),
      createMany: jest.fn().mockResolvedValue({}),
    },
  },
}))

import { ensureDefaultCategories } from '@/lib/categories'
import { db } from '@/lib/db'

describe('ensureDefaultCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates 6 default categories when none exist', async () => {
    ;(db.category.count as jest.Mock).mockResolvedValue(0)
    await ensureDefaultCategories('user_1')
    expect(db.category.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Food', userId: 'user_1' }),
        expect.objectContaining({ name: 'Groceries', userId: 'user_1' }),
        expect.objectContaining({ name: 'Other', userId: 'user_1' }),
      ]),
    })
    const callArg = (db.category.createMany as jest.Mock).mock.calls[0][0]
    expect(callArg.data).toHaveLength(6)
  })

  it('does nothing when user already has categories', async () => {
    ;(db.category.count as jest.Mock).mockResolvedValue(3)
    await ensureDefaultCategories('user_1')
    expect(db.category.createMany).not.toHaveBeenCalled()
  })
})
