import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create a demo user (bypasses Telegram auth)
  const user = await db.user.upsert({
    where: { telegramId: 999999999 },
    update: {},
    create: {
      telegramId: 999999999,
      telegramUsername: 'demo_user',
      baseCurrency: 'EUR',
    },
  })
  console.log('User created:', user.id)

  // Categories — delete existing and recreate
  await db.category.deleteMany({ where: { userId: user.id } })
  await db.category.createMany({
    data: [
      { userId: user.id, name: 'Food', color: '#5a8a60' },
      { userId: user.id, name: 'Groceries', color: '#5a68a8' },
      { userId: user.id, name: 'Transport', color: '#a3845a' },
      { userId: user.id, name: 'Health', color: '#a85a8a' },
      { userId: user.id, name: 'Entertainment', color: '#8a5a5a' },
      { userId: user.id, name: 'Other', color: '#9ca3af' },
    ],
  })
  const categories = await db.category.findMany({ where: { userId: user.id } })
  console.log('Categories created:', categories.length)

  const [food, groceries, transport, health, entertainment, other] = categories

  // Daily expenses — today and recent days
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2)
  const threeDaysAgo = new Date(today); threeDaysAgo.setDate(today.getDate() - 3)

  await db.dailyExpense.createMany({
    data: [
      // Today
      { userId: user.id, amount: 12.50, currency: 'EUR', categoryId: food.id, note: 'Lunch at café', source: 'web', createdAt: new Date(today.getTime() + 1000 * 60 * 60 * 12) },
      { userId: user.id, amount: 2.80, currency: 'EUR', categoryId: transport.id, note: 'Metro ticket', source: 'web', createdAt: new Date(today.getTime() + 1000 * 60 * 60 * 8) },
      { userId: user.id, amount: 4.50, currency: 'EUR', categoryId: food.id, note: 'Coffee', source: 'web', createdAt: new Date(today.getTime() + 1000 * 60 * 60 * 9) },
      // Yesterday
      { userId: user.id, amount: 67.30, currency: 'EUR', categoryId: groceries.id, note: 'Weekly shopping', source: 'web', createdAt: new Date(yesterday.getTime() + 1000 * 60 * 60 * 11) },
      { userId: user.id, amount: 35.00, currency: 'EUR', categoryId: health.id, note: 'Pharmacy', source: 'web', createdAt: new Date(yesterday.getTime() + 1000 * 60 * 60 * 16) },
      { userId: user.id, amount: 18.90, currency: 'EUR', categoryId: food.id, note: 'Dinner', source: 'web', createdAt: new Date(yesterday.getTime() + 1000 * 60 * 60 * 19) },
      // 2 days ago
      { userId: user.id, amount: 9.99, currency: 'EUR', categoryId: entertainment.id, note: 'Cinema ticket', source: 'web', createdAt: new Date(twoDaysAgo.getTime() + 1000 * 60 * 60 * 20) },
      { userId: user.id, amount: 3.20, currency: 'EUR', categoryId: transport.id, note: 'Bus', source: 'web', createdAt: new Date(twoDaysAgo.getTime() + 1000 * 60 * 60 * 9) },
      // 3 days ago
      { userId: user.id, amount: 45.00, currency: 'EUR', categoryId: other.id, note: 'New book', source: 'web', createdAt: new Date(threeDaysAgo.getTime() + 1000 * 60 * 60 * 14) },
      { userId: user.id, amount: 22.50, currency: 'EUR', categoryId: food.id, note: 'Lunch with friends', source: 'web', createdAt: new Date(threeDaysAgo.getTime() + 1000 * 60 * 60 * 13) },
    ],
  })
  console.log('Daily expenses created')

  // Recurring payments
  await db.recurringPayment.createMany({
    data: [
      { userId: user.id, name: 'Netflix', type: 'subscription', amount: 15.99, currency: 'EUR', frequencyPerYear: 12, category: 'Entertainment', status: 'active', nextPaymentDate: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 5) },
      { userId: user.id, name: 'Spotify', type: 'subscription', amount: 9.99, currency: 'EUR', frequencyPerYear: 12, category: 'Entertainment', status: 'active', nextPaymentDate: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 12) },
      { userId: user.id, name: 'Gym membership', type: 'expense', amount: 39.90, currency: 'EUR', frequencyPerYear: 12, category: 'Health', status: 'active', nextPaymentDate: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 3) },
      { userId: user.id, name: 'Rent', type: 'expense', amount: 900.00, currency: 'EUR', frequencyPerYear: 12, category: 'Housing', status: 'active', nextPaymentDate: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 8) },
      { userId: user.id, name: 'Internet', type: 'expense', amount: 29.99, currency: 'EUR', frequencyPerYear: 12, category: 'Utilities', status: 'active', nextPaymentDate: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 15) },
      { userId: user.id, name: 'Salary', type: 'income', amount: 3200.00, currency: 'EUR', frequencyPerYear: 12, category: 'Work', status: 'active', nextPaymentDate: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 20) },
      { userId: user.id, name: 'Freelance', type: 'income', amount: 800.00, currency: 'EUR', frequencyPerYear: 12, category: 'Work', status: 'active' },
      { userId: user.id, name: 'Old Adobe Plan', type: 'subscription', amount: 54.99, currency: 'EUR', frequencyPerYear: 12, category: 'Software', status: 'cancelled' },
    ],
  })
  console.log('Recurring payments created')

  // Goals
  await db.goal.createMany({
    data: [
      { userId: user.id, name: 'Emergency Fund', category: 'Savings', type: 'short', targetAmount: 5000, currentAmount: 2150, currency: 'EUR', deadline: new Date('2026-12-31'), description: '3 months of expenses as safety net' },
      { userId: user.id, name: 'New MacBook Pro', category: 'Tech', type: 'short', targetAmount: 2499, currentAmount: 890, currency: 'EUR', deadline: new Date('2026-09-01'), description: 'For work and creative projects' },
      { userId: user.id, name: 'Japan Trip', category: 'Travel', type: 'short', targetAmount: 3500, currentAmount: 600, currency: 'EUR', deadline: new Date('2027-03-01'), description: 'Cherry blossom season' },
      { userId: user.id, name: 'Investment Portfolio', category: 'Investments', type: 'long', targetAmount: 20000, currentAmount: 4200, currency: 'EUR', deadline: new Date('2030-01-01'), description: 'Long-term wealth building' },
    ],
  })
  console.log('Goals created')

  // Capital accounts
  await db.account.createMany({
    data: [
      { userId: user.id, name: 'Main Checking', type: 'debit', balance: 4320.50, currency: 'EUR', color: '#6366f1' },
      { userId: user.id, name: 'Savings Account', type: 'savings', balance: 8750.00, currency: 'EUR', color: '#5a8a60' },
      { userId: user.id, name: 'Cash Wallet', type: 'cash', balance: 120.00, currency: 'EUR', color: '#a3845a' },
      { userId: user.id, name: 'USD Account', type: 'debit', balance: 1500.00, currency: 'USD', color: '#5a68a8' },
    ],
  })
  console.log('Accounts created')

  console.log('\nSeed complete! Demo user ID:', user.id)
  console.log('To log in, you need to bypass Telegram auth. See instructions below.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
