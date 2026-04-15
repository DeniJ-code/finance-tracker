# Plan 2: Core Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the five core sections of Finance Tracker — daily expenses, regular payments, goals, capital, and dashboard — with full CRUD operations and data display.

**Architecture:** Each section follows the same pattern: a Next.js Server Component page fetches data directly from the DB (via `db` from `@/lib/db`) and passes serialized data (plain objects, no Decimal or Date instances) to a Client Component that handles modal state and mutations via Server Actions. Calculations live in `lib/calculations.ts` and are importable by both server and client code.

**Tech Stack:** Next.js 14 App Router, Prisma ORM (v5), Tailwind CSS, TypeScript. No new npm dependencies.

---

## File Structure

**New files to create:**
- `lib/calculations.ts` — pure calculation functions (no imports from app)
- `lib/format.ts` — currency/date formatting helpers (no imports from app)
- `lib/categories.ts` — default category seeding
- `lib/exchange.ts` — exchange rate fetching from Frankfurter API
- `app/(app)/daily/actions.ts` — Server Actions for daily expense CRUD
- `app/(app)/recurring/actions.ts` — Server Actions for recurring payment CRUD
- `app/(app)/goals/actions.ts` — Server Actions for goal CRUD
- `app/(app)/capital/actions.ts` — Server Actions for account CRUD
- `components/daily/DailyClient.tsx` — Client Component for the full daily page
- `components/recurring/RecurringClient.tsx` — Client Component for recurring page
- `components/goals/GoalsClient.tsx` — Client Component for goals page
- `components/capital/CapitalClient.tsx` — Client Component for capital page
- `__tests__/lib/calculations.test.ts`
- `__tests__/lib/categories.test.ts`
- `__tests__/app/daily/actions.test.ts`
- `__tests__/app/recurring/actions.test.ts`
- `__tests__/app/goals/actions.test.ts`
- `__tests__/app/capital/actions.test.ts`

**Files to modify:**
- `app/api/auth/telegram/route.ts` — call `ensureDefaultCategories` after user upsert
- `app/(app)/daily/page.tsx` — replace placeholder with real server component
- `app/(app)/recurring/page.tsx` — replace placeholder with real server component
- `app/(app)/goals/page.tsx` — replace placeholder with real server component
- `app/(app)/capital/page.tsx` — replace placeholder with real server component
- `app/(app)/dashboard/page.tsx` — replace placeholder with real server component

---

## Patterns used throughout

**Server Component page pattern:**
```tsx
// page.tsx — fetches from DB, serializes, passes to Client Component
export default async function SectionPage() {
  const session = await getSession()
  if (!session.userId) redirect('/auth')
  const rawData = await db.model.findMany({ where: { userId: session.userId } })
  const data = rawData.map(row => ({ ...row, amount: Number(row.amount) }))
  return <SectionClient data={data} />
}
```

**Client Component pattern:**
```tsx
'use client'
// Receives serialized data as props
// Uses useState for modal open/close + editTarget
// Calls server actions, then router.refresh() to re-fetch
// Uses key={editTarget?.id ?? 'new'} on modal to reset form state
```

**Server Action pattern:**
```typescript
'use server'
export async function createX(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')
  // validate + db.X.create(...)
  revalidatePath('/x')
}
export async function updateX(id: string, formData: FormData) { ... }
export async function deleteX(id: string) { ... }
```

**Decimal serialization:** Prisma returns `Decimal` objects. Always convert with `Number()` before passing from server to client: `amount: Number(row.amount)`.

**Date serialization:** Prisma returns `Date` objects. Always convert with `.toISOString()` before passing to client.

---

## Task 1: Calculation utilities, format helpers, and category seeding

**Files:**
- Create: `lib/calculations.ts`
- Create: `lib/format.ts`
- Create: `lib/categories.ts`
- Modify: `app/api/auth/telegram/route.ts` (lines 14–20, after user upsert)
- Create: `__tests__/lib/calculations.test.ts`
- Create: `__tests__/lib/categories.test.ts`

---

- [ ] **Step 1: Write the failing tests for calculations**

Create `__tests__/lib/calculations.test.ts`:

```typescript
import {
  monthlyAmount,
  annualAmount,
  monthsUntil,
  goalMonthlyRequired,
  goalProgressPercent,
} from '@/lib/calculations'

describe('monthlyAmount', () => {
  it('divides annual amount into 12 equal parts', () => {
    expect(monthlyAmount(1200, 1)).toBeCloseTo(100)
    expect(monthlyAmount(100, 12)).toBeCloseTo(100)
    expect(monthlyAmount(50, 4)).toBeCloseTo(16.67, 1)
  })
})

describe('annualAmount', () => {
  it('multiplies amount by frequency', () => {
    expect(annualAmount(100, 12)).toBe(1200)
    expect(annualAmount(365, 1)).toBe(365)
  })
})

describe('monthsUntil', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-15'))
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns months between now and a future date', () => {
    expect(monthsUntil(new Date('2027-04-15'))).toBe(12)
    expect(monthsUntil(new Date('2026-10-15'))).toBe(6)
  })

  it('returns at least 1 for past or current month dates', () => {
    expect(monthsUntil(new Date('2026-04-01'))).toBe(1)
    expect(monthsUntil(new Date('2025-01-01'))).toBe(1)
  })
})

describe('goalMonthlyRequired', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-15'))
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns (target - current) / months', () => {
    const deadline = new Date('2027-04-15') // 12 months away
    expect(goalMonthlyRequired(1200, 0, deadline)).toBeCloseTo(100)
    expect(goalMonthlyRequired(1200, 600, deadline)).toBeCloseTo(50)
  })

  it('returns 0 when goal is already reached', () => {
    const deadline = new Date('2027-04-15')
    expect(goalMonthlyRequired(1000, 1000, deadline)).toBe(0)
    expect(goalMonthlyRequired(1000, 1200, deadline)).toBe(0)
  })
})

describe('goalProgressPercent', () => {
  it('calculates percentage, capped at 100', () => {
    expect(goalProgressPercent(500, 1000)).toBe(50)
    expect(goalProgressPercent(0, 1000)).toBe(0)
    expect(goalProgressPercent(1000, 1000)).toBe(100)
    expect(goalProgressPercent(1500, 1000)).toBe(100)
  })

  it('returns 0 when target is 0', () => {
    expect(goalProgressPercent(0, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx jest __tests__/lib/calculations.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/lib/calculations'"

- [ ] **Step 3: Create `lib/calculations.ts`**

```typescript
export function monthlyAmount(amount: number, frequencyPerYear: number): number {
  return (amount * frequencyPerYear) / 12
}

export function annualAmount(amount: number, frequencyPerYear: number): number {
  return amount * frequencyPerYear
}

export function monthsUntil(deadline: Date): number {
  const now = new Date()
  const diff =
    (deadline.getFullYear() - now.getFullYear()) * 12 +
    (deadline.getMonth() - now.getMonth())
  return Math.max(1, diff)
}

export function goalMonthlyRequired(
  targetAmount: number,
  currentAmount: number,
  deadline: Date
): number {
  const remaining = targetAmount - currentAmount
  if (remaining <= 0) return 0
  return remaining / monthsUntil(deadline)
}

export function goalProgressPercent(currentAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0
  return Math.min(100, Math.round((currentAmount / targetAmount) * 100))
}
```

- [ ] **Step 4: Run to verify calculations tests pass**

```bash
npx jest __tests__/lib/calculations.test.ts --no-coverage
```

Expected: PASS — 10 tests passing

- [ ] **Step 5: Write failing tests for categories**

Create `__tests__/lib/categories.test.ts`:

```typescript
jest.mock('@/lib/db', () => ({
  db: {
    category: {
      count: jest.fn(),
      createMany: jest.fn().mockResolvedValue({}),
    },
  },
}))

import { ensureDefaultCategories } from '@/lib/categories'
import { db } from '@/lib/db'

describe('ensureDefaultCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates 6 default categories when none exist', async () => {
    ;(db.category.count as jest.Mock).mockResolvedValue(0)
    await ensureDefaultCategories('user_1')
    expect(db.category.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Food', userId: 'user_1' }),
        expect.objectContaining({ name: 'Groceries', userId: 'user_1' }),
        expect.objectContaining({ name: 'Other', userId: 'user_1' }),
      ]),
    })
    const callArg = (db.category.createMany as jest.Mock).mock.calls[0][0]
    expect(callArg.data).toHaveLength(6)
  })

  it('does nothing when user already has categories', async () => {
    ;(db.category.count as jest.Mock).mockResolvedValue(3)
    await ensureDefaultCategories('user_1')
    expect(db.category.createMany).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run to verify categories tests fail**

```bash
npx jest __tests__/lib/categories.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/lib/categories'"

- [ ] **Step 7: Create `lib/categories.ts`**

```typescript
import { db } from '@/lib/db'

export const DEFAULT_CATEGORIES = [
  { name: 'Food', color: '#5a8a60' },
  { name: 'Groceries', color: '#5a68a8' },
  { name: 'Transport', color: '#a3845a' },
  { name: 'Health', color: '#a85a8a' },
  { name: 'Entertainment', color: '#8a5a5a' },
  { name: 'Other', color: '#9ca3af' },
]

export async function ensureDefaultCategories(userId: string): Promise<void> {
  const count = await db.category.count({ where: { userId } })
  if (count > 0) return
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId })),
  })
}
```

- [ ] **Step 8: Create `lib/format.ts`**

No test needed — pure formatting wrappers.

```typescript
const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'RUB', 'GBP', 'CHF']

export function formatCurrency(amount: number, currency: string): string {
  const safeCurrency = SUPPORTED_CURRENCIES.includes(currency) ? currency : 'EUR'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}
```

- [ ] **Step 9: Create `lib/exchange.ts`**

No test needed — thin wrapper around external API.

```typescript
// Frankfurter API: https://api.frankfurter.app
// Returns rates FROM base TO others: { rates: { USD: 1.08, GBP: 0.85 } }
// So to convert X units of currency → base: X / rates[currency]

export async function fetchRates(base: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { [base]: 1 }
    const data = await res.json()
    return { ...data.rates, [base]: 1 }
  } catch {
    return { [base]: 1 }
  }
}

export function convertToBase(
  amount: number,
  currency: string,
  baseCurrency: string,
  rates: Record<string, number>
): number {
  if (currency === baseCurrency) return amount
  const rate = rates[currency] ?? 1
  return amount / rate
}
```

- [ ] **Step 10: Modify `app/api/auth/telegram/route.ts` to seed categories on first login**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyTelegramPayload, getSession } from '@/lib/auth'
import { ensureDefaultCategories } from '@/lib/categories'

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!verifyTelegramPayload(body)) {
    return NextResponse.json({ error: 'Invalid Telegram payload' }, { status: 401 })
  }

  const telegramId = BigInt(body.id)

  const user = await db.user.upsert({
    where: { telegramId },
    update: { telegramUsername: body.username ?? null },
    create: {
      telegramId,
      telegramUsername: body.username ?? null,
      baseCurrency: 'EUR',
    },
  })

  await ensureDefaultCategories(user.id)

  const session = await getSession()
  session.userId = user.id
  session.telegramId = Number(user.telegramId)
  session.telegramUsername = user.telegramUsername ?? undefined
  await session.save()

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 11: Run all tests to verify nothing is broken**

```bash
npx jest --no-coverage
```

Expected: All existing tests + new calculations + categories tests pass.

- [ ] **Step 12: Commit**

```bash
git add lib/calculations.ts lib/format.ts lib/categories.ts lib/exchange.ts \
  app/api/auth/telegram/route.ts \
  __tests__/lib/calculations.test.ts __tests__/lib/categories.test.ts
git commit -m "feat: add calculation utils, format helpers, category seeding, exchange rates"
```

---

## Task 2: Daily expenses page

**Files:**
- Create: `app/(app)/daily/actions.ts`
- Modify: `app/(app)/daily/page.tsx`
- Create: `components/daily/DailyClient.tsx`
- Create: `__tests__/app/daily/actions.test.ts`

---

- [ ] **Step 1: Write failing tests for daily actions**

Create `__tests__/app/daily/actions.test.ts`:

```typescript
jest.mock('@/lib/db', () => ({
  db: {
    dailyExpense: {
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ userId: 'user_1' }),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { createDailyExpense, deleteDailyExpense } from '@/app/(app)/daily/actions'
import { db } from '@/lib/db'

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe('createDailyExpense', () => {
  it('creates expense for authenticated user', async () => {
    await createDailyExpense(
      makeFormData({ amount: '12.50', categoryId: 'cat_1', note: 'lunch', currency: 'EUR' })
    )
    expect(db.dailyExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        amount: 12.5,
        categoryId: 'cat_1',
        note: 'lunch',
        source: 'web',
      }),
    })
  })

  it('throws for invalid amount', async () => {
    await expect(
      createDailyExpense(makeFormData({ amount: '-5', categoryId: 'cat_1' }))
    ).rejects.toThrow('Invalid amount')
  })

  it('throws when category is missing', async () => {
    await expect(
      createDailyExpense(makeFormData({ amount: '10', categoryId: '' }))
    ).rejects.toThrow('Category required')
  })
})

describe('deleteDailyExpense', () => {
  it('deletes expense for current user', async () => {
    await deleteDailyExpense('expense_1')
    expect(db.dailyExpense.deleteMany).toHaveBeenCalledWith({
      where: { id: 'expense_1', userId: 'user_1' },
    })
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx jest __tests__/app/daily/actions.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/app/(app)/daily/actions'"

- [ ] **Step 3: Create `app/(app)/daily/actions.ts`**

```typescript
'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createDailyExpense(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const amount = parseFloat(formData.get('amount') as string)
  const categoryId = formData.get('categoryId') as string
  const note = (formData.get('note') as string) || null
  const currency = (formData.get('currency') as string) || 'EUR'

  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount')
  if (!categoryId) throw new Error('Category required')

  await db.dailyExpense.create({
    data: { userId: session.userId, amount, currency, categoryId, note, source: 'web' },
  })
  revalidatePath('/daily')
}

export async function deleteDailyExpense(id: string) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.dailyExpense.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/daily')
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx jest __tests__/app/daily/actions.test.ts --no-coverage
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Replace `app/(app)/daily/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DailyClient } from '@/components/daily/DailyClient'

export default async function DailyPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const session = await getSession()
  if (!session.userId) redirect('/auth')

  const month = searchParams.month ?? new Date().toISOString().slice(0, 7)
  const [year, monthNum] = month.split('-').map(Number)
  const from = new Date(year, monthNum - 1, 1)
  const to = new Date(year, monthNum, 1)

  const [rawExpenses, rawCategories, user] = await Promise.all([
    db.dailyExpense.findMany({
      where: { userId: session.userId, createdAt: { gte: from, lt: to } },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.category.findMany({
      where: { userId: session.userId },
      orderBy: { name: 'asc' },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
  ])

  const expenses = rawExpenses.map(e => ({
    id: e.id,
    amount: Number(e.amount),
    currency: e.currency,
    note: e.note,
    createdAt: e.createdAt.toISOString(),
    category: { id: e.category.id, name: e.category.name, color: e.category.color },
  }))

  const categories = rawCategories.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }))

  return (
    <DailyClient
      expenses={expenses}
      categories={categories}
      month={month}
      baseCurrency={user?.baseCurrency ?? 'EUR'}
    />
  )
}
```

- [ ] **Step 6: Create `components/daily/DailyClient.tsx`**

```tsx
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
    if (!window.confirm('Delete this expense?')) return
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
                        className="opacity-0 group-hover:opacity-100 ml-1 text-zinc-600 hover:text-red-400 transition-opacity"
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
          <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Add expense</p>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
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
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
            >
              {isPending ? 'Saving...' : 'Save expense'}
            </button>
          </form>

          {/* Category breakdown */}
          {breakdown.length > 0 && (
            <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
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
```

- [ ] **Step 7: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add app/(app)/daily/actions.ts app/(app)/daily/page.tsx \
  components/daily/DailyClient.tsx \
  __tests__/app/daily/actions.test.ts
git commit -m "feat: daily expenses page with feed, quick-add, and category breakdown"
```

---

## Task 3: Regular payments page

**Files:**
- Create: `app/(app)/recurring/actions.ts`
- Modify: `app/(app)/recurring/page.tsx`
- Create: `components/recurring/RecurringClient.tsx`
- Create: `__tests__/app/recurring/actions.test.ts`

---

- [ ] **Step 1: Write failing tests for recurring actions**

Create `__tests__/app/recurring/actions.test.ts`:

```typescript
jest.mock('@/lib/db', () => ({
  db: {
    recurringPayment: {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ userId: 'user_1' }),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import {
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment,
} from '@/app/(app)/recurring/actions'
import { db } from '@/lib/db'

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

const validFields = {
  name: 'Netflix',
  type: 'subscription',
  amount: '15.99',
  currency: 'EUR',
  frequencyPerYear: '12',
  category: 'Entertainment',
  status: 'active',
}

describe('createRecurringPayment', () => {
  it('creates payment with correct data', async () => {
    await createRecurringPayment(makeFormData(validFields))
    expect(db.recurringPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        name: 'Netflix',
        type: 'subscription',
        amount: 15.99,
        frequencyPerYear: 12,
        status: 'active',
      }),
    })
  })

  it('throws when name is empty', async () => {
    await expect(
      createRecurringPayment(makeFormData({ ...validFields, name: '' }))
    ).rejects.toThrow('Name required')
  })

  it('throws for invalid type', async () => {
    await expect(
      createRecurringPayment(makeFormData({ ...validFields, type: 'invalid' }))
    ).rejects.toThrow('Invalid type')
  })
})

describe('updateRecurringPayment', () => {
  it('updates payment for current user', async () => {
    await updateRecurringPayment('pay_1', makeFormData(validFields))
    expect(db.recurringPayment.updateMany).toHaveBeenCalledWith({
      where: { id: 'pay_1', userId: 'user_1' },
      data: expect.objectContaining({ name: 'Netflix', amount: 15.99 }),
    })
  })
})

describe('deleteRecurringPayment', () => {
  it('deletes payment for current user', async () => {
    await deleteRecurringPayment('pay_1')
    expect(db.recurringPayment.deleteMany).toHaveBeenCalledWith({
      where: { id: 'pay_1', userId: 'user_1' },
    })
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx jest __tests__/app/recurring/actions.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/app/(app)/recurring/actions'"

- [ ] **Step 3: Create `app/(app)/recurring/actions.ts`**

```typescript
'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function parsePaymentFields(formData: FormData) {
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const amount = parseFloat(formData.get('amount') as string)
  const currency = (formData.get('currency') as string) || 'EUR'
  const frequencyPerYear = parseInt(formData.get('frequencyPerYear') as string, 10)
  const category = (formData.get('category') as string) || null
  const status = (formData.get('status') as string) || 'active'
  const nextPaymentDateStr = formData.get('nextPaymentDate') as string
  const nextPaymentDate = nextPaymentDateStr ? new Date(nextPaymentDateStr) : null
  const notes = (formData.get('notes') as string) || null

  if (!name) throw new Error('Name required')
  if (!['expense', 'income', 'subscription'].includes(type)) throw new Error('Invalid type')
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount')
  if (isNaN(frequencyPerYear) || frequencyPerYear <= 0) throw new Error('Invalid frequency')

  return { name, type, amount, currency, frequencyPerYear, category, status, nextPaymentDate, notes }
}

export async function createRecurringPayment(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const data = parsePaymentFields(formData)
  await db.recurringPayment.create({ data: { userId: session.userId, ...data } })
  revalidatePath('/recurring')
}

export async function updateRecurringPayment(id: string, formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const data = parsePaymentFields(formData)
  await db.recurringPayment.updateMany({ where: { id, userId: session.userId }, data })
  revalidatePath('/recurring')
}

export async function deleteRecurringPayment(id: string) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.recurringPayment.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/recurring')
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx jest __tests__/app/recurring/actions.test.ts --no-coverage
```

Expected: PASS — 5 tests passing

- [ ] **Step 5: Replace `app/(app)/recurring/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RecurringClient } from '@/components/recurring/RecurringClient'

export default async function RecurringPage() {
  const session = await getSession()
  if (!session.userId) redirect('/auth')

  const rawPayments = await db.recurringPayment.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })

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

  return <RecurringClient payments={payments} />
}
```

- [ ] **Step 6: Create `components/recurring/RecurringClient.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment,
} from '@/app/(app)/recurring/actions'
import { formatCurrency, formatDate } from '@/lib/format'
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

const CURRENCIES = ['EUR', 'USD', 'RUB', 'GBP', 'CHF']

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-lg">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">
          {initialData ? 'Edit payment' : 'Add payment'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={type} onChange={e => setType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount</label>
              <input
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
              <label className={labelCls}>Currency</label>
              <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Frequency</label>
              <select className={inputCls} value={freq} onChange={e => setFreq(e.target.value)}>
                {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input
                className={inputCls}
                placeholder="e.g. Software"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Next payment date</label>
              <input
                className={inputCls}
                type="date"
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
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
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2"
            >
              {isPending ? 'Saving...' : initialData ? 'Update' : 'Add payment'}
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

export function RecurringClient({ payments }: { payments: Payment[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<'all' | 'expense' | 'income' | 'subscription'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Payment | null>(null)

  const active = payments.filter(p => p.status === 'active')
  const expenses = active.filter(p => p.type !== 'income')
  const income = active.filter(p => p.type === 'income')
  const monthlyExp = expenses.reduce((s, p) => s + monthlyAmount(p.amount, p.frequencyPerYear), 0)
  const annualExp = expenses.reduce((s, p) => s + annualAmount(p.amount, p.frequencyPerYear), 0)
  const monthlyInc = income.reduce((s, p) => s + monthlyAmount(p.amount, p.frequencyPerYear), 0)
  const annualInc = income.reduce((s, p) => s + annualAmount(p.amount, p.frequencyPerYear), 0)

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
        <h1 className="text-xl font-semibold text-zinc-100">Regular Payments</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg px-3 py-1.5"
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
          { label: 'Annual expenses', value: annualExp },
          { label: 'Monthly expenses', value: monthlyExp },
          { label: 'Annual income', value: annualInc },
          { label: 'Monthly income', value: monthlyInc },
        ].map(card => (
          <div key={card.label} className="bg-zinc-900 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
            <p className="text-lg font-semibold text-zinc-100">
              {formatCurrency(card.value, 'EUR')}
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
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
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
                      className="p-1 text-zinc-600 hover:text-zinc-300"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={isPending}
                      className="p-1 text-zinc-600 hover:text-red-400"
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
```

- [ ] **Step 7: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add app/(app)/recurring/actions.ts app/(app)/recurring/page.tsx \
  components/recurring/RecurringClient.tsx \
  __tests__/app/recurring/actions.test.ts
git commit -m "feat: regular payments page with table, filters, and CRUD modal"
```

---

## Task 4: Goals page

**Files:**
- Create: `app/(app)/goals/actions.ts`
- Modify: `app/(app)/goals/page.tsx`
- Create: `components/goals/GoalsClient.tsx`
- Create: `__tests__/app/goals/actions.test.ts`

---

- [ ] **Step 1: Write failing tests for goals actions**

Create `__tests__/app/goals/actions.test.ts`:

```typescript
jest.mock('@/lib/db', () => ({
  db: {
    goal: {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ userId: 'user_1' }),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { createGoal, updateGoal, deleteGoal } from '@/app/(app)/goals/actions'
import { db } from '@/lib/db'

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

const validGoalFields = {
  name: 'New laptop',
  category: 'Tech',
  type: 'short',
  targetAmount: '2000',
  currentAmount: '500',
  currency: 'EUR',
  deadline: '2027-01-01',
  description: 'For work',
}

describe('createGoal', () => {
  it('creates goal with correct data', async () => {
    await createGoal(makeFormData(validGoalFields))
    expect(db.goal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        name: 'New laptop',
        type: 'short',
        targetAmount: 2000,
        currentAmount: 500,
        currency: 'EUR',
      }),
    })
  })

  it('throws when name is empty', async () => {
    await expect(
      createGoal(makeFormData({ ...validGoalFields, name: '' }))
    ).rejects.toThrow('Name required')
  })

  it('throws for invalid type', async () => {
    await expect(
      createGoal(makeFormData({ ...validGoalFields, type: 'invalid' }))
    ).rejects.toThrow('Invalid type')
  })

  it('throws for invalid target amount', async () => {
    await expect(
      createGoal(makeFormData({ ...validGoalFields, targetAmount: '-100' }))
    ).rejects.toThrow('Invalid target amount')
  })
})

describe('updateGoal', () => {
  it('updates goal for current user', async () => {
    await updateGoal('goal_1', makeFormData(validGoalFields))
    expect(db.goal.updateMany).toHaveBeenCalledWith({
      where: { id: 'goal_1', userId: 'user_1' },
      data: expect.objectContaining({ name: 'New laptop', targetAmount: 2000 }),
    })
  })
})

describe('deleteGoal', () => {
  it('deletes goal for current user', async () => {
    await deleteGoal('goal_1')
    expect(db.goal.deleteMany).toHaveBeenCalledWith({
      where: { id: 'goal_1', userId: 'user_1' },
    })
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx jest __tests__/app/goals/actions.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/app/(app)/goals/actions'"

- [ ] **Step 3: Create `app/(app)/goals/actions.ts`**

```typescript
'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function parseGoalFields(formData: FormData) {
  const name = formData.get('name') as string
  const category = (formData.get('category') as string) || null
  const type = formData.get('type') as string
  const targetAmount = parseFloat(formData.get('targetAmount') as string)
  const currentAmount = parseFloat(formData.get('currentAmount') as string) || 0
  const currency = (formData.get('currency') as string) || 'EUR'
  const deadline = new Date(formData.get('deadline') as string)
  const description = (formData.get('description') as string) || null

  if (!name) throw new Error('Name required')
  if (!['short', 'long'].includes(type)) throw new Error('Invalid type')
  if (isNaN(targetAmount) || targetAmount <= 0) throw new Error('Invalid target amount')
  if (isNaN(deadline.getTime())) throw new Error('Invalid deadline')

  return { name, category, type, targetAmount, currentAmount, currency, deadline, description }
}

export async function createGoal(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const data = parseGoalFields(formData)
  await db.goal.create({ data: { userId: session.userId, ...data } })
  revalidatePath('/goals')
}

export async function updateGoal(id: string, formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const data = parseGoalFields(formData)
  await db.goal.updateMany({ where: { id, userId: session.userId }, data })
  revalidatePath('/goals')
}

export async function deleteGoal(id: string) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.goal.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/goals')
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx jest __tests__/app/goals/actions.test.ts --no-coverage
```

Expected: PASS — 6 tests passing

- [ ] **Step 5: Replace `app/(app)/goals/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GoalsClient } from '@/components/goals/GoalsClient'

export default async function GoalsPage() {
  const session = await getSession()
  if (!session.userId) redirect('/auth')

  const rawGoals = await db.goal.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })

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

  return <GoalsClient goals={goals} />
}
```

- [ ] **Step 6: Create `components/goals/GoalsClient.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createGoal, updateGoal, deleteGoal } from '@/app/(app)/goals/actions'
import { formatCurrency, formatDate } from '@/lib/format'
import { goalMonthlyRequired, goalProgressPercent } from '@/lib/calculations'

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

const CURRENCIES = ['EUR', 'USD', 'RUB', 'GBP', 'CHF']

function borderColor(percent: number, deadline: string): string {
  if (percent >= 75) return '#5a8a60'
  const months = Math.max(
    0,
    (new Date(deadline).getFullYear() - new Date().getFullYear()) * 12 +
      new Date(deadline).getMonth() -
      new Date().getMonth()
  )
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
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={type} onChange={e => setType(e.target.value)}>
                <option value="short">Short-term</option>
                <option value="long">Long-term</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input
                className={inputCls}
                placeholder="e.g. Tech, Travel"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Target amount</label>
              <input
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
              <label className={labelCls}>Current amount</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                value={currentAmount}
                onChange={e => setCurrentAmount(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Deadline</label>
              <input
                className={inputCls}
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
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

export function GoalsClient({ goals }: { goals: Goal[] }) {
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
  const totalMonthlySavings = activeGoals.reduce(
    (s, g) => s + goalMonthlyRequired(g.targetAmount, g.currentAmount, new Date(g.deadline)),
    0
  )
  const totalSaved = activeGoals.reduce((s, g) => s + g.currentAmount, 0)

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
          { label: 'Monthly savings needed', value: formatCurrency(totalMonthlySavings, 'EUR') },
          { label: 'Total saved', value: formatCurrency(totalSaved, 'EUR') },
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
          const months = Math.max(
            0,
            (new Date(g.deadline).getFullYear() - now.getFullYear()) * 12 +
              new Date(g.deadline).getMonth() -
              now.getMonth()
          )
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
                  <button onClick={() => openEdit(g)} className="p-1 text-zinc-600 hover:text-zinc-300">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
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
```

- [ ] **Step 7: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add app/(app)/goals/actions.ts app/(app)/goals/page.tsx \
  components/goals/GoalsClient.tsx \
  __tests__/app/goals/actions.test.ts
git commit -m "feat: goals page with progress cards and CRUD modal"
```

---

## Task 5: Capital page

**Files:**
- Create: `app/(app)/capital/actions.ts`
- Modify: `app/(app)/capital/page.tsx`
- Create: `components/capital/CapitalClient.tsx`
- Create: `__tests__/app/capital/actions.test.ts`

Note: `lib/exchange.ts` was created in Task 1.

---

- [ ] **Step 1: Write failing tests for capital actions**

Create `__tests__/app/capital/actions.test.ts`:

```typescript
jest.mock('@/lib/db', () => ({
  db: {
    account: {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ userId: 'user_1' }),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { createAccount, updateAccount, deleteAccount } from '@/app/(app)/capital/actions'
import { db } from '@/lib/db'

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

const validAccountFields = {
  name: 'Main account',
  type: 'debit',
  balance: '5000',
  currency: 'EUR',
  color: '#5a68a8',
}

describe('createAccount', () => {
  it('creates account with correct data', async () => {
    await createAccount(makeFormData(validAccountFields))
    expect(db.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        name: 'Main account',
        type: 'debit',
        balance: 5000,
        currency: 'EUR',
        color: '#5a68a8',
      }),
    })
  })

  it('throws when name is empty', async () => {
    await expect(
      createAccount(makeFormData({ ...validAccountFields, name: '' }))
    ).rejects.toThrow('Name required')
  })
})

describe('updateAccount', () => {
  it('updates account for current user', async () => {
    await updateAccount('acc_1', makeFormData(validAccountFields))
    expect(db.account.updateMany).toHaveBeenCalledWith({
      where: { id: 'acc_1', userId: 'user_1' },
      data: expect.objectContaining({ name: 'Main account', balance: 5000 }),
    })
  })
})

describe('deleteAccount', () => {
  it('deletes account for current user', async () => {
    await deleteAccount('acc_1')
    expect(db.account.deleteMany).toHaveBeenCalledWith({
      where: { id: 'acc_1', userId: 'user_1' },
    })
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx jest __tests__/app/capital/actions.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/app/(app)/capital/actions'"

- [ ] **Step 3: Create `app/(app)/capital/actions.ts`**

```typescript
'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createAccount(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const type = (formData.get('type') as string) || 'debit'
  const balance = parseFloat(formData.get('balance') as string) || 0
  const currency = (formData.get('currency') as string) || 'EUR'
  const color = (formData.get('color') as string) || '#5a68a8'

  if (!name) throw new Error('Name required')

  await db.account.create({
    data: { userId: session.userId, name, type, balance, currency, color },
  })
  revalidatePath('/capital')
}

export async function updateAccount(id: string, formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const type = (formData.get('type') as string) || 'debit'
  const balance = parseFloat(formData.get('balance') as string) || 0
  const currency = (formData.get('currency') as string) || 'EUR'
  const color = (formData.get('color') as string) || '#5a68a8'

  if (!name) throw new Error('Name required')

  await db.account.updateMany({
    where: { id, userId: session.userId },
    data: { name, type, balance, currency, color },
  })
  revalidatePath('/capital')
}

export async function deleteAccount(id: string) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.account.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/capital')
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx jest __tests__/app/capital/actions.test.ts --no-coverage
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Replace `app/(app)/capital/page.tsx`**

```tsx
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
  const rates = await fetchRates(baseCurrency)

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
```

- [ ] **Step 6: Create `components/capital/CapitalClient.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createAccount, updateAccount, deleteAccount } from '@/app/(app)/capital/actions'
import { formatCurrency, formatDate } from '@/lib/format'

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

const CURRENCIES = ['EUR', 'USD', 'RUB', 'GBP', 'CHF']
const ACCOUNT_TYPES = ['debit', 'savings', 'cash', 'other']
const COLOR_PRESETS = ['#5a68a8', '#5a8a60', '#a3845a', '#a85a8a', '#8a5a5a', '#6366f1', '#9ca3af']

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
  const [color, setColor] = useState(initialData?.color ?? '#5a68a8')

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">
          {initialData ? 'Edit account' : 'Add account'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={type} onChange={e => setType(e.target.value)}>
                {ACCOUNT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Balance</label>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              value={balance}
              onChange={e => setBalance(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? 'white' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2"
            >
              {isPending ? 'Saving...' : initialData ? 'Update' : 'Add account'}
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
    if (!window.confirm('Delete this account?')) return
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
      <div className="bg-zinc-900 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Total capital</p>
          <p className="text-3xl font-semibold text-zinc-100">
            {formatCurrency(totalCapital, baseCurrency)}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            {lastUpdated && ` · Updated ${formatDate(lastUpdated)}`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg px-3 py-1.5"
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
        <div className="grid grid-cols-3 gap-4">
          {accounts.map(a => (
            <div
              key={a.id}
              className="bg-zinc-900 rounded-xl overflow-hidden border-t-4"
              style={{ borderTopColor: a.color }}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{a.name}</h3>
                    <span className="text-xs text-zinc-500 capitalize">{a.type}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(a)} className="p-1 text-zinc-600 hover:text-zinc-300">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
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
                <p className="text-xl font-semibold text-zinc-100">
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
        <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
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
```

- [ ] **Step 7: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add app/(app)/capital/actions.ts app/(app)/capital/page.tsx \
  components/capital/CapitalClient.tsx \
  __tests__/app/capital/actions.test.ts
git commit -m "feat: capital page with account cards, distribution bar, and CRUD modal"
```

---

## Task 6: Dashboard

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

No new tests for this task — the dashboard only reads data. All calculation functions used here are already tested in Task 1.

---

- [ ] **Step 1: Replace `app/(app)/dashboard/page.tsx`**

The dashboard fetches all required data in one server component and renders it inline. No separate client component is needed — the quick-add button links to `/daily`, not a modal.

```tsx
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
    db.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
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
  const rates = await fetchRates(baseCurrency)

  // KPI: total capital
  const totalCapital = rawAccounts.reduce(
    (s, a) => s + convertToBase(Number(a.balance), a.currency, baseCurrency, rates),
    0
  )

  // KPI: monthly expenses / income
  const expensePayments = rawPayments.filter(p => p.type !== 'income')
  const incomePayments = rawPayments.filter(p => p.type === 'income')
  const monthlyExpenses = expensePayments.reduce(
    (s, p) => s + monthlyAmount(Number(p.amount), p.frequencyPerYear),
    0
  )
  const monthlyIncome = incomePayments.reduce(
    (s, p) => s + monthlyAmount(Number(p.amount), p.frequencyPerYear),
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
          <div key={card.label} className="bg-zinc-900 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
            <p className="text-xl font-semibold text-zinc-100">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Middle row: goals + upcoming */}
      <div className="grid grid-cols-2 gap-4">
        {/* Goal progress */}
        <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
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
        <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-zinc-200">Upcoming payments</p>
            <Link href="/recurring" className="text-xs text-indigo-400 hover:text-indigo-300">
              View all
            </Link>
          </div>
          {upcoming.length === 0 && (
            <p className="text-xs text-zinc-600">No upcoming payments with dates set.</p>
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
                    {daysUntil <= 0 ? 'today' : `in ${daysUntil}d`}
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
      <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-zinc-200">Today</p>
          <Link
            href="/daily"
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                todayExpenses.reduce((s, e) => s + e.amount, 0),
                baseCurrency
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests to confirm everything still passes**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/dashboard/page.tsx
git commit -m "feat: dashboard with KPI cards, goal progress, upcoming payments, and today's expenses"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|---|---|
| Dashboard — 4 KPI cards | Task 6 ✓ |
| Dashboard — goal progress panel | Task 6 ✓ |
| Dashboard — upcoming payments panel | Task 6 ✓ |
| Dashboard — recent daily expenses row + quick-add button | Task 6 ✓ (links to /daily) |
| Daily — chronological feed grouped by day | Task 2 ✓ |
| Daily — month navigation | Task 2 ✓ |
| Daily — quick-add panel (amount, categories, note) | Task 2 ✓ |
| Daily — category breakdown bar | Task 2 ✓ |
| Regular payments — summary bar (4 values) | Task 3 ✓ |
| Regular payments — filter tabs | Task 3 ✓ |
| Regular payments — table with all columns | Task 3 ✓ |
| Regular payments — cancelled items struck-through | Task 3 ✓ |
| Regular payments — add/edit modal | Task 3 ✓ |
| Goals — summary bar | Task 4 ✓ |
| Goals — filter (Active/All/Completed) | Task 4 ✓ |
| Goals — progress cards with left border color | Task 4 ✓ |
| Goals — monthly saving calculation live | Task 4 ✓ |
| Goals — add/edit modal | Task 4 ✓ |
| Capital — total card | Task 5 ✓ |
| Capital — account cards (3-column grid) | Task 5 ✓ |
| Capital — distribution bar | Task 5 ✓ |
| Capital — currency conversion to base | Task 5 ✓ (via exchange.ts) |
| Capital — add/edit modal | Task 5 ✓ |
| Category seeding on first login | Task 1 ✓ |
| Calculations centralized in lib/calculations.ts | Task 1 ✓ |

### Out of scope for this plan (deferred to Plan 3)
- Telegram bot integration
- Category management UI (settings section)
- Investment section
- Data export (CSV)
- Telegram expense parsing
