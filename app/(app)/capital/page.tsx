import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { fetchRates, convertToBase } from '@/lib/exchange'
import { CapitalClient } from '@/components/capital/CapitalClient'

export default async function CapitalPage() {
  const session = await getSession()
  if (!session.userId) redirect('/auth')

  const [rawAccounts, user] = await Promise.all([
    db.account.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'asc' },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
  ])

  const baseCurrency = user?.baseCurrency ?? 'EUR'
  const rates = rawAccounts.length > 0 ? await fetchRates(baseCurrency) : {}

  const accounts = rawAccounts.map(a => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance),
    currency: a.currency,
    color: a.color,
    updatedAt: a.updatedAt.toISOString(),
    balanceInBase: convertToBase(Number(a.balance), a.currency, baseCurrency, rates),
  }))

  return <CapitalClient accounts={accounts} baseCurrency={baseCurrency} />
}
