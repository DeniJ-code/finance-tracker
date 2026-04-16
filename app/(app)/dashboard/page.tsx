import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchRates, convertToBase } from '@/lib/exchange'
import { monthlyAmount, goalMonthlyRequired, goalProgressPercent } from '@/lib/calculations'
import { formatCurrency, formatDate } from '@/lib/format'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session.userId) redirect('/auth')

  const userId = session.userId

  const [rawAccounts, rawPayments, rawGoals, rawExpenses, user] = await Promise.all([
    db.account.findMany({ where: { userId } }),
    db.recurringPayment.findMany({ where: { userId, status: 'active' } }),
    db.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.dailyExpense.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.user.findUnique({ where: { id: userId } }),
  ])

  const baseCurrency = user?.baseCurrency ?? 'EUR'
  const rates = rawAccounts.length > 0 ? await fetchRates(baseCurrency) : {}

  // KPI: total capital
  const totalCapital = rawAccounts.reduce(
    (s, a) => s + convertToBase(Number(a.balance), a.currency, baseCurrency, rates),
    0
  )

  // KPI: monthly expenses / income
  const expensePayments = rawPayments.filter(p => p.type !== 'income')
  const incomePayments = rawPayments.filter(p => p.type === 'income')
  const monthlyExpenses = expensePayments.reduce(
    (s, p) => s + convertToBase(monthlyAmount(Number(p.amount), p.frequencyPerYear), p.currency, baseCurrency, rates),
    0
  )
  const monthlyIncome = incomePayments.reduce(
    (s, p) => s + convertToBase(monthlyAmount(Number(p.amount), p.frequencyPerYear), p.currency, baseCurrency, rates),
    0
  )

  // KPI: monthly goal savings
  const now = new Date()
  const activeGoals = rawGoals.filter(
    g => Number(g.currentAmount) < Number(g.targetAmount) && new Date(g.deadline) > now
  )
  const monthlyGoalSavings = activeGoals.reduce(
    (s, g) =>
      s + goalMonthlyRequired(Number(g.targetAmount), Number(g.currentAmount), new Date(g.deadline)),
    0
  )

  // Upcoming payments: active with nextPaymentDate, sorted soonest first, next 5
  const upcoming = rawPayments
    .filter(p => p.nextPaymentDate != null)
    .sort((a, b) => a.nextPaymentDate!.getTime() - b.nextPaymentDate!.getTime())
    .slice(0, 5)

  // Today's expenses
  const todayExpenses = rawExpenses.map(e => ({
    id: e.id,
    amount: Number(e.amount),
    currency: e.currency,
    note: e.note,
    category: { name: e.category.name, color: e.category.color },
  }))

  const kpiCards = [
    { label: 'Total capital', value: formatCurrency(totalCapital, baseCurrency) },
    { label: 'Monthly expenses', value: formatCurrency(monthlyExpenses, baseCurrency) },
    { label: 'Monthly income', value: formatCurrency(monthlyIncome, baseCurrency) },
    { label: 'Monthly goal savings', value: formatCurrency(monthlyGoalSavings, baseCurrency) },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {kpiCards.map(card => (
          <div key={card.label} className="bg-zinc-900 rounded-xl p-4 ring-1 ring-white/[0.06]">
            <p className="text-xs text-zinc-500 mb-1.5">{card.label}</p>
            <p className="text-2xl font-semibold text-zinc-100 tabular-nums tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Middle row: goals + upcoming */}
      <div className="grid grid-cols-2 gap-4">
        {/* Goal progress */}
        <div className="bg-zinc-900 rounded-xl p-4 space-y-3 ring-1 ring-white/[0.06]">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-zinc-200">Goals</p>
            <Link href="/goals" className="text-xs text-indigo-400 hover:text-indigo-300">
              View all
            </Link>
          </div>
          {activeGoals.length === 0 && (
            <p className="text-xs text-zinc-600">No active goals.</p>
          )}
          {activeGoals.slice(0, 4).map(g => {
            const pct = goalProgressPercent(Number(g.currentAmount), Number(g.targetAmount))
            return (
              <div key={g.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 truncate max-w-[60%]">{g.name}</span>
                  <span className="text-zinc-500">
                    {formatCurrency(Number(g.currentAmount), g.currency)} /{' '}
                    {formatCurrency(Number(g.targetAmount), g.currency)}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-600 text-right">{pct}%</p>
              </div>
            )
          })}
        </div>

        {/* Upcoming payments */}
        <div className="bg-zinc-900 rounded-xl p-4 space-y-3 ring-1 ring-white/[0.06]">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-zinc-200">Upcoming payments</p>
            <Link href="/recurring" className="text-xs text-indigo-400 hover:text-indigo-300">
              View all
            </Link>
          </div>
          {upcoming.length === 0 && (
            <p className="text-xs text-zinc-600">No upcoming payments. Set a date on a payment to see it here.</p>
          )}
          {upcoming.map(p => {
            const daysUntil = Math.ceil(
              (p.nextPaymentDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
            return (
              <div key={p.id} className="flex justify-between items-center py-1">
                <div>
                  <p className="text-sm text-zinc-200">{p.name}</p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(p.nextPaymentDate!)} ·{' '}
                    {daysUntil < 0 ? 'overdue' : daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                  </p>
                </div>
                <p className="text-sm font-medium text-zinc-300">
                  {formatCurrency(Number(p.amount), p.currency)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent daily expenses */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-3 ring-1 ring-white/[0.06]">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-zinc-200">Today</p>
          <Link
            href="/daily"
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add expense
          </Link>
        </div>
        {todayExpenses.length === 0 && (
          <p className="text-xs text-zinc-600">No expenses recorded today.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {todayExpenses.map(e => (
            <div
              key={e.id}
              className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-3 py-1.5 text-sm"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: e.category.color }}
              />
              <span className="text-zinc-300">{e.note || e.category.name}</span>
              <span className="text-zinc-400 font-medium">
                {formatCurrency(e.amount, e.currency)}
              </span>
            </div>
          ))}
        </div>
        {todayExpenses.length > 0 && (
          <p className="text-xs text-zinc-600 text-right">
            Total:{' '}
            <span className="text-zinc-400">
              {formatCurrency(
                todayExpenses.reduce((s, e) => s + convertToBase(e.amount, e.currency, baseCurrency, rates), 0),
                baseCurrency
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
