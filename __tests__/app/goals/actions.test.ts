jest.mock('@/lib/db', () => ({
  db: {
    goal: {
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

import { createGoal, updateGoal, deleteGoal } from '@/app/(app)/goals/actions'
import { db } from '@/lib/db'

beforeEach(() => jest.clearAllMocks())

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

const validGoalFields = {
  name: 'New laptop',
  category: 'Tech',
  type: 'short',
  targetAmount: '2000',
  currentAmount: '500',
  currency: 'EUR',
  deadline: '2027-01-01',
  description: 'For work',
}

describe('createGoal', () => {
  it('creates goal with correct data', async () => {
    await createGoal(makeFormData(validGoalFields))
    expect(db.goal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        name: 'New laptop',
        type: 'short',
        targetAmount: 2000,
        currentAmount: 500,
        currency: 'EUR',
      }),
    })
  })

  it('throws when name is empty', async () => {
    await expect(
      createGoal(makeFormData({ ...validGoalFields, name: '' }))
    ).rejects.toThrow('Name required')
  })

  it('throws for invalid type', async () => {
    await expect(
      createGoal(makeFormData({ ...validGoalFields, type: 'invalid' }))
    ).rejects.toThrow('Invalid type')
  })

  it('throws for invalid target amount', async () => {
    await expect(
      createGoal(makeFormData({ ...validGoalFields, targetAmount: '-100' }))
    ).rejects.toThrow('Invalid target amount')
  })
})

describe('updateGoal', () => {
  it('updates goal for current user', async () => {
    await updateGoal('goal_1', makeFormData(validGoalFields))
    expect(db.goal.updateMany).toHaveBeenCalledWith({
      where: { id: 'goal_1', userId: 'user_1' },
      data: expect.objectContaining({ name: 'New laptop', targetAmount: 2000 }),
    })
  })
})

describe('deleteGoal', () => {
  it('deletes goal for current user', async () => {
    await deleteGoal('goal_1')
    expect(db.goal.deleteMany).toHaveBeenCalledWith({
      where: { id: 'goal_1', userId: 'user_1' },
    })
  })
})
