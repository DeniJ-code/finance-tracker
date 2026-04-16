'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment,
} from '@/app/(app)/recurring/actions'
import { formatCurrency, formatDate, SUPPORTED_CURRENCIES } from '@/lib/format'
import { monthlyAmount, annualAmount } from '@/lib/calculations'

type Payment = {
  id: string
  name: string
  type: string
  amount: number
  currency: string
  frequencyPerYear: number
  category: string | null
  status: string
  nextPaymentDate: string | null
  notes: string | null
}

const TYPE_LABELS: Record<string, string> = {
  expense: 'Expense',
  income: 'Income',
  subscription: 'Subscription',
}

const FREQ_OPTIONS = [
  { label: 'Annual (1×)', value: '1' },
  { label: 'Semi-annual (2×)', value: '2' },
  { label: 'Quarterly (4×)', value: '4' },
  { label: 'Monthly (12×)', value: '12' },
  { label: 'Bi-weekly (26×)', value: '26' },
  { label: 'Weekly (52×)', value: '52' },
]

function PaymentModal({
  initialData,
  onClose,
}: {
  initialData: Payment | null
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initialData?.name ?? '')
  const [type, setType] = useState(initialData?.type ?? 'expense')
  const [amount, setAmount] = useState(String(initialData?.amount ?? ''))
  const [currency, setCurrency] = useState(initialData?.currency ?? 'EUR')
  const [freq, setFreq] = useState(String(initialData?.frequencyPerYear ?? '12'))
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'active')
  const [nextDate, setNextDate] = useState(
    initialData?.nextPaymentDate ? initialData.nextPaymentDate.slice(0, 10) : ''
  )
  const [notes, setNotes] = useState(initialData?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', name)
    fd.append('type', type)
    fd.append('amount', amount)
    fd.append('currency', currency)
    fd.append('frequencyPerYear', freq)
    fd.append('category', category)
    fd.append('status', status)
    fd.append('nextPaymentDate', nextDate)
    fd.append('notes', notes)
    startTransition(async () => {
      if (initialData) {
        await updateRecurringPayment(initialData.id, fd)
      } else {
        await createRecurringPayment(fd)
      }
      onClose()
      router.refresh()
    })
  }

  const inputCls =
    'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-xs text-zinc-400 mb-1'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-lg ring-1 ring-white/[0.08]">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">
          {initialData ? 'Edit payment' : 'Add payment'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="pm-name" className={labelCls}>Name</label>
              <input id="pm-name" className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="pm-type" className={labelCls}>Type</label>
              <select id="pm-type" className={inputCls} value={type} onChange={e => setType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
            <div>
              <label htmlFor="pm-status" className={labelCls}>Status</label>
              <select id="pm-status" className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label htmlFor="pm-amount" className={labelCls}>Amount</label>
              <input
                id="pm-amount"
                className={inputCls}
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="pm-currency" className={labelCls}>Currency</label>
              <select id="pm-currency" className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                {SUPPORTED_CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pm-frequency" className={labelCls}>Frequency</label>
              <select id="pm-frequency" className={inputCls} value={freq} onChange={e => setFreq(e.target.value)}>
                {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pm-category" className={labelCls}>Category</label>
              <input
                id="pm-category"
                className={inputCls}
                placeholder="e.g. Software"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="pm-nextPaymentDate" className={labelCls}>Next payment date</label>
              <input
                id="pm-nextPaymentDate"
                className={inputCls}
                type="date"
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="pm-notes" className={labelCls}>Notes</label>
              <textarea
                id="pm-notes"
                className={inputCls}
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 active:scale-[0.96] text-white text-sm font-medium rounded-lg py-2 transition-[transform,opacity]"
            >
              {isPending ? 'Saving...' : initialData ? 'Update' : 'Add payment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.96] text-zinc-300 text-sm font-medium rounded-lg py-2 transition-[transform,background-color]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function RecurringClient({
  payments,
  baseCurrency,
  kpi,
}: {
  payments: Payment[]
  baseCurrency: string
  kpi: { monthlyExpenses: number; annualExpenses: number; monthlyIncome: number; annualIncome: number }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<'all' | 'expense' | 'income' | 'subscription'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Payment | null>(null)

  const filtered =
    filter === 'all' ? payments : payments.filter(p => p.type === filter)

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(p: Payment) {
    setEditTarget(p)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this payment?')) return
    startTransition(async () => {
      await deleteRecurringPayment(id)
      router.refresh()
    })
  }

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'expense', label: 'Expenses' },
    { key: 'income', label: 'Income' },
    { key: 'subscription', label: 'Subscriptions' },
  ] as const

  return (
    <div className="p-6 space-y-6">
      {modalOpen && (
        <PaymentModal
          key={editTarget?.id ?? 'new'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100 tabular-nums">Regular Payments</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.96] text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-[transform,opacity]"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add payment
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Annual expenses', value: kpi.annualExpenses },
          { label: 'Monthly expenses', value: kpi.monthlyExpenses },
          { label: 'Annual income', value: kpi.annualIncome },
          { label: 'Monthly income', value: kpi.monthlyIncome },
        ].map(card => (
          <div key={card.label} className="bg-zinc-900 rounded-xl p-4 ring-1 ring-white/[0.06]">
            <p className="text-xs text-zinc-500 mb-1.5">{card.label}</p>
            <p className="text-xl font-semibold text-zinc-100 tabular-nums tracking-tight">
              {formatCurrency(card.value, baseCurrency)}
            </p>
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

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden ring-1 ring-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {['Type', 'Name', 'Amount', 'Frequency', 'Annual', 'Monthly', 'Status', 'Next date', ''].map(
                h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-zinc-600 text-sm">
                  No payments yet.
                </td>
              </tr>
            )}
            {filtered.map(p => (
              <tr
                key={p.id}
                className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${
                  p.status === 'cancelled' ? 'opacity-40' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      color:
                        p.type === 'income'
                          ? '#5a8a60'
                          : p.type === 'subscription'
                          ? '#5a68a8'
                          : '#a3845a',
                      backgroundColor:
                        p.type === 'income'
                          ? '#5a8a6020'
                          : p.type === 'subscription'
                          ? '#5a68a820'
                          : '#a3845a20',
                    }}
                  >
                    {TYPE_LABELS[p.type]}
                  </span>
                </td>
                <td className={`px-4 py-3 text-zinc-200 ${p.status === 'cancelled' ? 'line-through' : ''}`}>
                  {p.name}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {formatCurrency(p.amount, p.currency)}
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.frequencyPerYear}×/yr</td>
                <td className="px-4 py-3 text-zinc-300">
                  {formatCurrency(annualAmount(p.amount, p.frequencyPerYear), p.currency)}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {formatCurrency(monthlyAmount(p.amount, p.frequencyPerYear), p.currency)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium ${
                      p.status === 'active' ? 'text-[#5a8a60]' : 'text-zinc-600'
                    }`}
                  >
                    {p.status === 'active' ? 'Active' : 'Cancelled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {p.nextPaymentDate ? formatDate(p.nextPaymentDate) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      aria-label={`Edit ${p.name}`}
                      className="w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      aria-label={`Delete ${p.name}`}
                      disabled={isPending}
                      className="w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors rounded"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
