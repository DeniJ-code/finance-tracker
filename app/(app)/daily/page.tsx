import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DailyClient } from '@/components/daily/DailyClient'

export default async function DailyPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const session = await getSession()
  if (!session.userId) redirect('/auth')

  const month = searchParams.month ?? new Date().toISOString().slice(0, 7)
  const [year, monthNum] = month.split('-').map(Number)
  const from = new Date(year, monthNum - 1, 1)
  const to = new Date(year, monthNum, 1)

  const [rawExpenses, rawCategories, user] = await Promise.all([
    db.dailyExpense.findMany({
      where: { userId: session.userId, createdAt: { gte: from, lt: to } },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.category.findMany({
      where: { userId: session.userId },
      orderBy: { name: 'asc' },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
  ])

  const expenses = rawExpenses.map(e => ({
    id: e.id,
    amount: Number(e.amount),
    currency: e.currency,
    note: e.note,
    createdAt: e.createdAt.toISOString(),
    category: { id: e.category.id, name: e.category.name, color: e.category.color },
  }))

  const categories = rawCategories.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }))

  return (
    <DailyClient
      expenses={expenses}
      categories={categories}
      month={month}
      baseCurrency={user?.baseCurrency ?? 'EUR'}
    />
  )
}
