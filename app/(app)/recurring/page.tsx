import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RecurringClient } from '@/components/recurring/RecurringClient'
import { monthlyAmount, annualAmount } from '@/lib/calculations'
import { fetchRates, convertToBase } from '@/lib/exchange'

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

  const baseCurrency = user?.baseCurrency ?? 'EUR'
  const rates = rawPayments.length > 0 ? await fetchRates(baseCurrency) : {}

  const activePayments = rawPayments.filter(p => p.status === 'active')
  const expenses = activePayments.filter(p => p.type !== 'income')
  const income = activePayments.filter(p => p.type === 'income')
  const kpi = {
    monthlyExpenses: expenses.reduce((s, p) => s + convertToBase(monthlyAmount(Number(p.amount), p.frequencyPerYear), p.currency, baseCurrency, rates), 0),
    annualExpenses: expenses.reduce((s, p) => s + convertToBase(annualAmount(Number(p.amount), p.frequencyPerYear), p.currency, baseCurrency, rates), 0),
    monthlyIncome: income.reduce((s, p) => s + convertToBase(monthlyAmount(Number(p.amount), p.frequencyPerYear), p.currency, baseCurrency, rates), 0),
    annualIncome: income.reduce((s, p) => s + convertToBase(annualAmount(Number(p.amount), p.frequencyPerYear), p.currency, baseCurrency, rates), 0),
  }

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

  return <RecurringClient payments={payments} baseCurrency={baseCurrency} kpi={kpi} />
}
