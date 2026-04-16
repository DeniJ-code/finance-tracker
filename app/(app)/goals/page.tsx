import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GoalsClient } from '@/components/goals/GoalsClient'

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

  return <GoalsClient goals={goals} baseCurrency={user?.baseCurrency ?? 'EUR'} />
}
