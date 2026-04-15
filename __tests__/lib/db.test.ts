import { db } from '@/lib/db'

describe('Prisma client', () => {
  afterAll(async () => {
    await db.$disconnect()
  })

  it('exports a PrismaClient instance', () => {
    expect(db).toBeDefined()
    expect(typeof db.user.findFirst).toBe('function')
    expect(typeof db.account.findFirst).toBe('function')
    expect(typeof db.recurringPayment.findFirst).toBe('function')
    expect(typeof db.goal.findFirst).toBe('function')
    expect(typeof db.dailyExpense.findFirst).toBe('function')
    expect(typeof db.investment.findFirst).toBe('function')
    expect(typeof db.category.findFirst).toBe('function')
  })
})
