'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createGoal, updateGoal, deleteGoal } from '@/app/(app)/goals/actions'
import { formatCurrency, formatDate, SUPPORTED_CURRENCIES } from '@/lib/format'
import { goalMonthlyRequired, goalProgressPercent, monthsUntil } from '@/lib/calculations'

type Goal = {
  id: string
  name: string
  category: string | null
  type: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline: string
  description: string | null
}

function borderColor(percent: number, deadline: string): string {
  if (percent >= 75) return '#5a8a60'
  const months = Math.max(0, monthsUntil(new Date(deadline)) - 1)
  if (months <= 3 && percent < 50) return '#a3845a'
  return '#6366f1'
}

function GoalModal({
  initialData,
  onClose,
}: {
  initialData: Goal | null
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initialData?.name ?? '')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [type, setType] = useState(initialData?.type ?? 'short')
  const [targetAmount, setTargetAmount] = useState(String(initialData?.targetAmount ?? ''))
  const [currentAmount, setCurrentAmount] = useState(String(initialData?.currentAmount ?? '0'))
  const [currency, setCurrency] = useState(initialData?.currency ?? 'EUR')
  const [deadline, setDeadline] = useState(
    initialData?.deadline ? initialData.deadline.slice(0, 10) : ''
  )
  const [description, setDescription] = useState(initialData?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', name)
    fd.append('category', category)
    fd.append('type', type)
    fd.append('targetAmount', targetAmount)
    fd.append('currentAmount', currentAmount)
    fd.append('currency', currency)
    fd.append('deadline', deadline)
    fd.append('description', description)
    startTransition(async () => {
      if (initialData) {
        await updateGoal(initialData.id, fd)
      } else {
        await createGoal(fd)
      }
      onClose()
      router.refresh()
    })
  }

  const inputCls =
    'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-xs text-zinc-400 mb-1'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-lg">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">
          {initialData ? 'Edit goal' : 'Add goal'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="gm-name" className={labelCls}>Name</label>
              <input id="gm-name" className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="gm-type" className={labelCls}>Type</label>
              <select id="gm-type" className={inputCls} value={type} onChange={e => setType(e.target.value)}>
                <option value="short">Short-term</option>
                <option value="long">Long-term</option>
              </select>
            </div>
            <div>
              <label htmlFor="gm-category" className={labelCls}>Category</label>
              <input
                id="gm-category"
                className={inputCls}
                placeholder="e.g. Tech, Travel"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="gm-targetAmount" className={labelCls}>Target amount</label>
              <input
                id="gm-targetAmount"
                className={inputCls}
                type="number"
                step="0.01"
                min="0.01"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="gm-currentAmount" className={labelCls}>Current amount</label>
              <input
                id="gm-currentAmount"
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                value={currentAmount}
                onChange={e => setCurrentAmount(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="gm-currency" className={labelCls}>Currency</label>
              <select id="gm-currency" className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                {SUPPORTED_CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="gm-deadline" className={labelCls}>Deadline</label>
              <input
                id="gm-deadline"
                className={inputCls}
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="gm-description" className={labelCls}>Description</label>
              <textarea
                id="gm-description"
                className={inputCls}
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2"
            >
              {isPending ? 'Saving...' : initialData ? 'Update' : 'Add goal'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function GoalsClient({
  goals,
  baseCurrency,
  totalSaved,
  totalMonthlySavings,
}: {
  goals: Goal[]
  baseCurrency: string
  totalSaved: number
  totalMonthlySavings: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<'active' | 'all' | 'completed'>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Goal | null>(null)

  const now = new Date()

  function isCompleted(g: Goal) {
    return g.currentAmount >= g.targetAmount
  }

  function isActive(g: Goal) {
    return !isCompleted(g) && new Date(g.deadline) > now
  }

  const activeGoals = goals.filter(isActive)

  const filtered =
    filter === 'active'
      ? activeGoals
      : filter === 'completed'
      ? goals.filter(isCompleted)
      : goals

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(g: Goal) {
    setEditTarget(g)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this goal?')) return
    startTransition(async () => {
      await deleteGoal(id)
      router.refresh()
    })
  }

  const filterTabs = [
    { key: 'active', label: 'Active' },
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
  ] as const

  return (
    <div className="p-6 space-y-6">
      {modalOpen && (
        <GoalModal
          key={editTarget?.id ?? 'new'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">Goals</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg px-3 py-1.5"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add goal
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active goals', value: String(activeGoals.length) },
          { label: 'Monthly savings needed', value: formatCurrency(totalMonthlySavings, baseCurrency) },
          { label: 'Total saved', value: formatCurrency(totalSaved, baseCurrency) },
        ].map(c => (
          <div key={c.label} className="bg-zinc-900 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{c.label}</p>
            <p className="text-lg font-semibold text-zinc-100">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goal cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <p className="text-zinc-500 text-sm col-span-2">No goals in this filter.</p>
        )}
        {filtered.map(g => {
          const percent = goalProgressPercent(g.currentAmount, g.targetAmount)
          const monthly = goalMonthlyRequired(g.targetAmount, g.currentAmount, new Date(g.deadline))
          const months = Math.max(0, monthsUntil(new Date(g.deadline)) - 1)
          const accent = borderColor(percent, g.deadline)

          return (
            <div
              key={g.id}
              className="bg-zinc-900 rounded-xl p-4 border-l-4"
              style={{ borderLeftColor: accent }}
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">{g.name}</h3>
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {g.type === 'short' ? 'Short-term' : 'Long-term'}
                    </span>
                    {g.category && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {g.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(g)} aria-label={`Edit ${g.name}`} className="p-1 text-zinc-600 hover:text-zinc-300">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    aria-label={`Delete ${g.name}`}
                    disabled={isPending}
                    className="p-1 text-zinc-600 hover:text-red-400"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {g.description && (
                <p className="text-xs text-zinc-500 mt-1 mb-2">{g.description}</p>
              )}

              <div className="grid grid-cols-3 gap-2 mt-3 mb-3 text-center">
                <div>
                  <p className="text-xs text-zinc-500">Saved / Target</p>
                  <p className="text-sm font-medium text-zinc-200">
                    {formatCurrency(g.currentAmount, g.currency)} /{' '}
                    {formatCurrency(g.targetAmount, g.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Monthly</p>
                  <p className="text-sm font-medium text-zinc-200">
                    {formatCurrency(monthly, g.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Months left</p>
                  <p className="text-sm font-medium text-zinc-200">{months}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{percent}%</span>
                  <span>{formatCurrency(g.targetAmount - g.currentAmount, g.currency)} remaining</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${percent}%`, backgroundColor: accent }}
                  />
                </div>
                <p className="text-xs text-zinc-600 text-right">Deadline: {formatDate(g.deadline)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
