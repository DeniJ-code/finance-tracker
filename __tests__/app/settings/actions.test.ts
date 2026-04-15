// Mock Prisma and session before importing the action
jest.mock('@/lib/db', () => ({
  db: { user: { update: jest.fn().mockResolvedValue({}) } },
}))
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ userId: 'user_1' }),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { updateBaseCurrency } from '@/app/(app)/settings/actions'
import { db } from '@/lib/db'

function makeFormData(currency: string) {
  const fd = new FormData()
  fd.append('currency', currency)
  return fd
}

describe('updateBaseCurrency', () => {
  it('updates the user base currency', async () => {
    await updateBaseCurrency(makeFormData('USD'))
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { baseCurrency: 'USD' },
    })
  })

  it('throws for unsupported currency', async () => {
    await expect(updateBaseCurrency(makeFormData('XYZ'))).rejects.toThrow('Unsupported currency')
  })
})
