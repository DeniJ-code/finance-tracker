import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RecurringClient } from '@/components/recurring/RecurringClient'

export default async function RecurringPage() {
  const session = await getSession()
  if (!session.userId) redirect('/auth')

  const [rawPayments, user] = await Promise.all([
    db.recurringPayment.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    }),
    db.user.findUnique({
      where: { id: session.userId },
      select: { baseCurrency: true },
    }),
  ])

  const payments = rawPayments.map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    amount: Number(p.amount),
    currency: p.currency,
    frequencyPerYear: p.frequencyPerYear,
    category: p.category,
    status: p.status,
    nextPaymentDate: p.nextPaymentDate?.toISOString() ?? null,
    notes: p.notes,
  }))

  return <RecurringClient payments={payments} baseCurrency={user?.baseCurrency ?? 'EUR'} />
}
