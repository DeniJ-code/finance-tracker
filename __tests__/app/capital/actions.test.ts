jest.mock('@/lib/db', () => ({
  db: {
    account: {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ userId: 'user_1' }),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { createAccount, updateAccount, deleteAccount } from '@/app/(app)/capital/actions'
import { db } from '@/lib/db'

beforeEach(() => jest.clearAllMocks())

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

const validAccountFields = {
  name: 'Main account',
  type: 'debit',
  balance: '5000',
  currency: 'EUR',
  color: '#5a68a8',
}

describe('createAccount', () => {
  it('creates account with correct data', async () => {
    await createAccount(makeFormData(validAccountFields))
    expect(db.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        name: 'Main account',
        type: 'debit',
        balance: 5000,
        currency: 'EUR',
        color: '#5a68a8',
      }),
    })
  })

  it('throws when name is empty', async () => {
    await expect(
      createAccount(makeFormData({ ...validAccountFields, name: '' }))
    ).rejects.toThrow('Name required')
  })
})

describe('updateAccount', () => {
  it('updates account for current user', async () => {
    await updateAccount('acc_1', makeFormData(validAccountFields))
    expect(db.account.updateMany).toHaveBeenCalledWith({
      where: { id: 'acc_1', userId: 'user_1' },
      data: expect.objectContaining({ name: 'Main account', balance: 5000 }),
    })
  })
})

describe('deleteAccount', () => {
  it('deletes account for current user', async () => {
    await deleteAccount('acc_1')
    expect(db.account.deleteMany).toHaveBeenCalledWith({
      where: { id: 'acc_1', userId: 'user_1' },
    })
  })
})
