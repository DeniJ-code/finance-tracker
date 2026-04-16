'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createAccount, updateAccount, deleteAccount } from '@/app/(app)/capital/actions'
import { formatCurrency, formatDate, SUPPORTED_CURRENCIES } from '@/lib/format'

type Account = {
  id: string
  name: string
  type: string
  balance: number
  currency: string
  color: string
  updatedAt: string
  balanceInBase: number
}

const ACCOUNT_TYPES = ['debit', 'savings', 'cash', 'other']
const COLOR_PRESETS: { value: string; label: string }[] = [
  { value: '#5a68a8', label: 'Blue' },
  { value: '#5a8a60', label: 'Green' },
  { value: '#a3845a', label: 'Brown' },
  { value: '#a85a8a', label: 'Purple' },
  { value: '#8a5a5a', label: 'Red' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#9ca3af', label: 'Gray' },
]

function AccountModal({
  initialData,
  onClose,
}: {
  initialData: Account | null
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initialData?.name ?? '')
  const [type, setType] = useState(initialData?.type ?? 'debit')
  const [balance, setBalance] = useState(String(initialData?.balance ?? '0'))
  const [currency, setCurrency] = useState(initialData?.currency ?? 'EUR')
  const [color, setColor] = useState(initialData?.color ?? COLOR_PRESETS[0].value)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', name)
    fd.append('type', type)
    fd.append('balance', balance)
    fd.append('currency', currency)
    fd.append('color', color)
    startTransition(async () => {
      if (initialData) {
        await updateAccount(initialData.id, fd)
      } else {
        await createAccount(fd)
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
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md ring-1 ring-white/[0.08]">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">
          {initialData ? 'Edit account' : 'Add account'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="am-name" className={labelCls}>Name</label>
            <input id="am-name" className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="am-type" className={labelCls}>Type</label>
              <select id="am-type" className={inputCls} value={type} onChange={e => setType(e.target.value)}>
                {ACCOUNT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="am-currency" className={labelCls}>Currency</label>
              <select id="am-currency" className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                {SUPPORTED_CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="am-balance" className={labelCls}>Balance</label>
            <input
              id="am-balance"
              className={inputCls}
              type="number"
              step="0.01"
              value={balance}
              onChange={e => setBalance(e.target.value)}
            />
          </div>
          <div>
            <label id="am-color-label" className={labelCls}>Color</label>
            <div role="group" aria-labelledby="am-color-label" className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  aria-label={`Select ${c.label}`}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c.value,
                    borderColor: color === c.value ? 'white' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 active:scale-[0.96] text-white text-sm font-medium rounded-lg py-2 transition-[transform,opacity]"
            >
              {isPending ? 'Saving...' : initialData ? 'Update' : 'Add account'}
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

export function CapitalClient({
  accounts,
  baseCurrency,
}: {
  accounts: Account[]
  baseCurrency: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)

  const totalCapital = accounts.reduce((s, a) => s + a.balanceInBase, 0)
  const lastUpdated =
    accounts.length > 0
      ? new Date(Math.max(...accounts.map(a => new Date(a.updatedAt).getTime())))
      : null

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(a: Account) {
    setEditTarget(a)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    if (!window.confirm(`Delete "${accounts.find(x => x.id === id)?.name ?? 'this account'}"?`)) return
    startTransition(async () => {
      await deleteAccount(id)
      router.refresh()
    })
  }

  return (
    <div className="p-6 space-y-6">
      {modalOpen && (
        <AccountModal
          key={editTarget?.id ?? 'new'}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Total capital card */}
      <div className="bg-zinc-900 rounded-xl p-5 flex items-center justify-between ring-1 ring-white/[0.06]">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Total capital</p>
          <p className="text-3xl font-semibold text-zinc-100 tabular-nums tracking-tight">
            {formatCurrency(totalCapital, baseCurrency)}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            {lastUpdated && ` · Updated ${formatDate(lastUpdated)}`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.96] text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-[transform,opacity]"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add account
        </button>
      </div>

      {/* Account cards grid */}
      {accounts.length === 0 ? (
        <p className="text-zinc-500 text-sm">No accounts yet. Add one to track your capital.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => (
            <div
              key={a.id}
              className="bg-zinc-900 rounded-xl overflow-hidden border-t-4 ring-1 ring-white/[0.06]"
              style={{ borderTopColor: a.color }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{a.name}</h3>
                    <span className="text-xs text-zinc-500 capitalize">{a.type}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(a)}
                      aria-label={`Edit ${a.name}`}
                      className="w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={isPending}
                      aria-label={`Delete ${a.name}`}
                      className="w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors rounded"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xl font-semibold text-zinc-100 tabular-nums">
                  {formatCurrency(a.balance, a.currency)}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Updated {formatDate(a.updatedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Distribution bar */}
      {accounts.length > 1 && (
        <div className="bg-zinc-900 rounded-xl p-4 space-y-3 ring-1 ring-white/[0.06]">
          <p className="text-xs font-medium text-zinc-400">Distribution</p>
          <div className="h-3 rounded-full overflow-hidden flex">
            {accounts.map(a => {
              const pct = totalCapital > 0 ? (a.balanceInBase / totalCapital) * 100 : 0
              return (
                <div
                  key={a.id}
                  style={{ width: `${pct}%`, backgroundColor: a.color }}
                  title={`${a.name}: ${pct.toFixed(1)}%`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {accounts.map(a => {
              const pct = totalCapital > 0 ? (a.balanceInBase / totalCapital) * 100 : 0
              return (
                <div key={a.id} className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                  {a.name} ({pct.toFixed(1)}%)
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
