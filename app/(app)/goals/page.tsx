import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GoalsClient } from '@/components/goals/GoalsClient'
import { fetchRates, convertToBase } from '@/lib/exchange'
import { goalMonthlyRequired } from '@/lib/calculations'

export default async function GoalsPage() {
  const session = await getSession()
  if (!session.userId) redirect('/auth')

  const [rawGoals, user] = await Promise.all([
    db.goal.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    }),
    db.user.findUnique({ where: { id: session.userId }, select: { baseCurrency: true } }),
  ])

  const baseCurrency = user?.baseCurrency ?? 'EUR'
  const rates = rawGoals.length > 0 ? await fetchRates(baseCurrency) : {}

  const now = new Date()
  const activeGoals = rawGoals.filter(
    g => Number(g.currentAmount) < Number(g.targetAmount) && new Date(g.deadline) > now
  )
  const totalSaved = activeGoals.reduce(
    (s, g) => s + convertToBase(Number(g.currentAmount), g.currency, baseCurrency, rates),
    0
  )
  const totalMonthlySavings = activeGoals.reduce(
    (s, g) => s + convertToBase(
      goalMonthlyRequired(Number(g.targetAmount), Number(g.currentAmount), new Date(g.deadline)),
      g.currency, baseCurrency, rates
    ),
    0
  )

  const goals = rawGoals.map(g => ({
    id: g.id,
    name: g.name,
    category: g.category,
    type: g.type,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    currency: g.currency,
    deadline: g.deadline.toISOString(),
    description: g.description,
  }))

  return (
    <GoalsClient
      goals={goals}
      baseCurrency={baseCurrency}
      totalSaved={totalSaved}
      totalMonthlySavings={totalMonthlySavings}
    />
  )
}
