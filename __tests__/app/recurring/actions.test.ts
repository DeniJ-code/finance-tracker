jest.mock('@/lib/db', () => ({
  db: {
    recurringPayment: {
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

import {
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment,
} from '@/app/(app)/recurring/actions'
import { db } from '@/lib/db'

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

const validFields = {
  name: 'Netflix',
  type: 'subscription',
  amount: '15.99',
  currency: 'EUR',
  frequencyPerYear: '12',
  category: 'Entertainment',
  status: 'active',
}

describe('createRecurringPayment', () => {
  it('creates payment with correct data', async () => {
    await createRecurringPayment(makeFormData(validFields))
    expect(db.recurringPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        name: 'Netflix',
        type: 'subscription',
        amount: 15.99,
        frequencyPerYear: 12,
        status: 'active',
      }),
    })
  })

  it('throws when name is empty', async () => {
    await expect(
      createRecurringPayment(makeFormData({ ...validFields, name: '' }))
    ).rejects.toThrow('Name required')
  })

  it('throws for invalid type', async () => {
    await expect(
      createRecurringPayment(makeFormData({ ...validFields, type: 'invalid' }))
    ).rejects.toThrow('Invalid type')
  })

  it('throws for invalid amount', async () => {
    await expect(
      createRecurringPayment(makeFormData({ ...validFields, amount: '0' }))
    ).rejects.toThrow('Invalid amount')
  })

  it('throws for invalid frequency', async () => {
    await expect(
      createRecurringPayment(makeFormData({ ...validFields, frequencyPerYear: '0' }))
    ).rejects.toThrow('Invalid frequency')
  })
})

describe('updateRecurringPayment', () => {
  it('updates payment for current user', async () => {
    await updateRecurringPayment('pay_1', makeFormData(validFields))
    expect(db.recurringPayment.updateMany).toHaveBeenCalledWith({
      where: { id: 'pay_1', userId: 'user_1' },
      data: expect.objectContaining({ name: 'Netflix', amount: 15.99 }),
    })
  })
})

describe('deleteRecurringPayment', () => {
  it('deletes payment for current user', async () => {
    await deleteRecurringPayment('pay_1')
    expect(db.recurringPayment.deleteMany).toHaveBeenCalledWith({
      where: { id: 'pay_1', userId: 'user_1' },
    })
  })
})
