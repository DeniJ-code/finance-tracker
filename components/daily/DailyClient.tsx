'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createDailyExpense, deleteDailyExpense } from '@/app/(app)/daily/actions'
import { formatCurrency, formatMonth } from '@/lib/format'

type Category = { id: string; name: string; color: string }
type Expense = {
  id: string
  amount: number
  currency: string
  note: string | null
  createdAt: string
  category: Category
}

function prevMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function groupByDay(expenses: Expense[]): [string, Expense[]][] {
  const groups: Record<string, Expense[]> = {}
  for (const e of expenses) {
    const day = e.createdAt.slice(0, 10)
    if (!groups[day]) groups[day] = []
    groups[day].push(e)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function formatDayHeader(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function DailyClient({
  expenses,
  categories,
  month,
  baseCurrency,
}: {
  expenses: Expense[]
  categories: Category[]
  month: string
  baseCurrency: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState('')
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id ?? '')
  const [note, setNote] = useState('')

  const monthTotal = expenses.reduce((s, e) => s + e.amount, 0)

  const breakdown = categories
    .map(cat => ({
      ...cat,
      total: expenses.filter(e => e.category.id === cat.id).reduce((s, e) => s + e.amount, 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxBreakdown = breakdown[0]?.total ?? 1

  function handleNavMonth(target: string) {
    router.push(`/daily?month=${target}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0 || !selectedCatId) return
    const fd = new FormData()
    fd.append('amount', String(parsed))
    fd.append('categoryId', selectedCatId)
    fd.append('note', note)
    fd.append('currency', baseCurrency)
    startTransition(async () => {
      await createDailyExpense(fd)
      setAmount('')
      setNote('')
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm(`Delete "${expenses.find(x => x.id === id)?.note || expenses.find(x => x.id === id)?.category.name || 'this expense'}"?`)) return
    startTransition(async () => {
      await deleteDailyExpense(id)
      router.refresh()
    })
  }

  const grouped = groupByDay(expenses)

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">Daily Expenses</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNavMonth(prevMonth(month))}
            className="p-1 text-zinc-400 hover:text-zinc-100"
            aria-label="Previous month"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-sm font-medium text-zinc-200 w-36 text-center capitalize">
            {formatMonth(month)}
          </span>
          <button
            onClick={() => handleNavMonth(nextMonth(month))}
            className="p-1 text-zinc-400 hover:text-zinc-100"
            aria-label="Next month"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <span className="text-sm text-zinc-400 ml-4">
            Total: <span className="text-zinc-100 font-medium">{formatCurrency(monthTotal, baseCurrency)}</span>
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_300px] gap-6 flex-1 min-h-0">
        {/* Left: expense feed */}
        <div className="overflow-y-auto space-y-4 pr-2">
          {grouped.length === 0 && (
            <p className="text-zinc-500 text-sm">No expenses for this month.</p>
          )}
          {grouped.map(([day, dayExpenses]) => {
            const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0)
            return (
              <div key={day}>
                <div className="flex justify-between items-center mb-1 py-1 border-b border-zinc-800">
                  <span className="text-xs font-medium text-zinc-400 capitalize">
                    {formatDayHeader(day + 'T12:00:00')}
                  </span>
                  <span className="text-xs text-zinc-500">{formatCurrency(dayTotal, baseCurrency)}</span>
                </div>
                <div className="space-y-0.5">
                  {dayExpenses.map(expense => (
                    <div
                      key={expense.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-900 group"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: expense.category.color }}
                      />
                      <span className="flex-1 text-sm text-zinc-200 truncate">
                        {expense.note || expense.category.name}
                      </span>
                      <span className="text-xs text-zinc-500 w-16 text-right">
                        {expense.category.name}
                      </span>
                      <span className="text-xs text-zinc-500 w-10 text-right">
                        {formatTime(expense.createdAt)}
                      </span>
                      <span className="text-sm font-medium text-zinc-100 w-20 text-right">
                        {formatCurrency(expense.amount, expense.currency)}
                      </span>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="opacity-0 group-hover:opacity-100 ml-1 w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-opacity rounded"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: quick-add + breakdown */}
        <div className="space-y-5 overflow-y-auto">
          {/* Quick-add form */}
          <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl p-4 space-y-3 ring-1 ring-white/[0.06]">
            <p className="text-xs font-medium text-zinc-400 tracking-wide">Add expense</p>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-2xl font-light text-right focus:outline-none focus:border-indigo-500"
              required
            />
            <div className="grid grid-cols-3 gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCatId === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 active:scale-[0.96] text-white text-sm font-medium rounded-lg py-2 transition-[transform,opacity]"
            >
              {isPending ? 'Saving...' : 'Save expense'}
            </button>
          </form>

          {/* Category breakdown */}
          {breakdown.length > 0 && (
            <div className="bg-zinc-900 rounded-xl p-4 space-y-2 ring-1 ring-white/[0.06]">
              <p className="text-xs font-medium text-zinc-400">This month</p>
              {breakdown.map(cat => (
                <div key={cat.id} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="text-zinc-400">{formatCurrency(cat.total, baseCurrency)}</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${(cat.total / maxBreakdown) * 100}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
