# Finance Tracker — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js project with PostgreSQL, Telegram auth, and a working sidebar shell — every page exists but shows a placeholder. You can log in via Telegram and navigate between sections.

**Architecture:** Next.js 14 App Router monolith. Prisma manages the DB schema. Auth uses Telegram Login Widget on the web; a signed payload is verified server-side and stored in an httpOnly cookie session via `iron-session`. The sidebar is a persistent client component; page content is server-rendered.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Inter (Google Fonts), Prisma + PostgreSQL, iron-session, Jest + @testing-library/react

---

## File Map

```
finance-tracker/
├── prisma/
│   └── schema.prisma                  # Full DB schema
├── app/
│   ├── layout.tsx                     # Root layout: font, auth redirect
│   ├── page.tsx                       # Redirect → /dashboard
│   ├── auth/
│   │   └── page.tsx                   # Login page — Telegram widget
│   ├── dashboard/page.tsx             # Placeholder
│   ├── daily/page.tsx                 # Placeholder
│   ├── recurring/page.tsx             # Placeholder
│   ├── goals/page.tsx                 # Placeholder
│   ├── capital/page.tsx               # Placeholder
│   ├── investments/page.tsx           # Placeholder
│   └── settings/
│       ├── page.tsx                   # Settings UI
│       └── actions.ts                 # Server action: update base currency
│   └── api/
│       ├── auth/telegram/route.ts     # POST: verify Telegram payload, set session
│       └── auth/logout/route.ts       # POST: clear session
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx               # Wraps sidebar + main content
│   │   └── Sidebar.tsx                # Nav links, active state
│   └── auth/
│       └── TelegramLoginButton.tsx    # Client component: renders Telegram widget
├── lib/
│   ├── db.ts                          # Prisma singleton
│   ├── auth.ts                        # verifyTelegramPayload(), getSession()
│   └── session.ts                     # iron-session config + types
├── middleware.ts                      # Redirect unauthenticated → /auth
├── .env.local.example                 # Template for required env vars
└── jest.config.ts                     # Jest + Next.js config
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `.env.local.example`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Create Next.js app**

```bash
cd /home/deni/Schreibtisch/Vibecoding/Finance-Tracker
npx create-next-app@14 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

When prompted: answer Yes to all defaults. Do not create a `src/` directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install prisma @prisma/client iron-session
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @types/jest ts-jest
```

- [ ] **Step 3: Configure Inter font in `app/layout.tsx`**

Replace the generated `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Finance Tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Create `.env.local.example`**

```bash
# .env.local.example
DATABASE_URL="postgresql://user:password@localhost:5432/finance_tracker"
TELEGRAM_BOT_TOKEN="your_bot_token_here"
SESSION_SECRET="at_least_32_chars_random_string_here"
NEXT_PUBLIC_TELEGRAM_BOT_NAME="your_bot_username_here"
```

Copy it to `.env.local` and fill in real values before running the app.

- [ ] **Step 5: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 14 project with Inter font and Jest"
```

---

## Task 2: Prisma schema + database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

- [ ] **Step 1: Initialise Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

- [ ] **Step 2: Write the full schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String             @id @default(cuid())
  telegramId        BigInt             @unique
  telegramUsername  String?
  baseCurrency      String             @default("EUR")
  createdAt         DateTime           @default(now())
  accounts          Account[]
  recurringPayments RecurringPayment[]
  goals             Goal[]
  dailyExpenses     DailyExpense[]
  categories        Category[]
  investments       Investment[]
}

model Account {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  type      String   // debit | savings | cash | other
  balance   Decimal  @db.Decimal(12, 2)
  currency  String   @default("EUR")
  color     String   @default("#5a68a8")
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}

model RecurringPayment {
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name             String
  type             String    // expense | income | subscription
  amount           Decimal   @db.Decimal(12, 2)
  currency         String    @default("EUR")
  frequencyPerYear Int
  status           String    @default("active") // active | cancelled
  nextPaymentDate  DateTime?
  category         String?
  notes            String?
  createdAt        DateTime  @default(now())
}

model Goal {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String
  category      String?
  type          String   // short | long
  targetAmount  Decimal  @db.Decimal(12, 2)
  currentAmount Decimal  @db.Decimal(12, 2) @default(0)
  currency      String   @default("EUR")
  deadline      DateTime
  description   String?
  createdAt     DateTime @default(now())
}

model Category {
  id            String         @id @default(cuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String
  color         String         @default("#9ca3af")
  dailyExpenses DailyExpense[]
}

model DailyExpense {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount     Decimal  @db.Decimal(12, 2)
  currency   String   @default("EUR")
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
  note       String?
  source     String   @default("web") // web | bot
  createdAt  DateTime @default(now())
}

model Investment {
  id                   String   @id @default(cuid())
  userId               String
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name                 String
  assetType            String   // crypto | stock_ru | stock_world | manual
  exchange             String?  // binance | mexc | kraken | bybit | moex | yahoo
  ticker               String?
  quantity             Decimal  @db.Decimal(18, 8)
  purchasePricePerUnit Decimal  @db.Decimal(12, 2)
  purchaseDate         DateTime
  currency             String   @default("EUR")
  monthlyContribution  Decimal? @db.Decimal(12, 2)
  createdAt            DateTime @default(now())
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 4: Create Prisma singleton**

Create `lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 5: Write test for schema integrity**

Create `__tests__/lib/db.test.ts`:

```typescript
import { db } from '@/lib/db'

describe('Prisma client', () => {
  it('exports a PrismaClient instance', () => {
    expect(db).toBeDefined()
    expect(typeof db.user.findFirst).toBe('function')
    expect(typeof db.account.findFirst).toBe('function')
    expect(typeof db.recurringPayment.findFirst).toBe('function')
    expect(typeof db.goal.findFirst).toBe('function')
    expect(typeof db.dailyExpense.findFirst).toBe('function')
    expect(typeof db.investment.findFirst).toBe('function')
    expect(typeof db.category.findFirst).toBe('function')
  })
})
```

- [ ] **Step 6: Run test**

```bash
npm test -- --testPathPattern=db.test
```

Expected: PASS (1 test)

- [ ] **Step 7: Commit**

```bash
git add prisma/ lib/db.ts __tests__/
git commit -m "feat: add Prisma schema with all models and db singleton"
```

---

## Task 3: Session config + Telegram auth verification

**Files:**
- Create: `lib/session.ts`
- Create: `lib/auth.ts`
- Create: `__tests__/lib/auth.test.ts`

- [ ] **Step 1: Write failing test for `verifyTelegramPayload`**

Create `__tests__/lib/auth.test.ts`:

```typescript
import crypto from 'crypto'
import { verifyTelegramPayload } from '@/lib/auth'

function makeValidPayload(botToken: string) {
  const fields = {
    id: '123456789',
    first_name: 'Test',
    username: 'testuser',
    auth_date: String(Math.floor(Date.now() / 1000)),
  }
  const dataCheckString = Object.keys(fields)
    .sort()
    .map(k => `${k}=${fields[k as keyof typeof fields]}`)
    .join('\n')
  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  return { ...fields, hash }
}

describe('verifyTelegramPayload', () => {
  const BOT_TOKEN = 'test_bot_token_123'

  beforeAll(() => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN
  })

  it('returns true for a valid signed payload', () => {
    const payload = makeValidPayload(BOT_TOKEN)
    expect(verifyTelegramPayload(payload)).toBe(true)
  })

  it('returns false when hash is tampered', () => {
    const payload = makeValidPayload(BOT_TOKEN)
    expect(verifyTelegramPayload({ ...payload, hash: 'badhash' })).toBe(false)
  })

  it('returns false when a field is modified after signing', () => {
    const payload = makeValidPayload(BOT_TOKEN)
    expect(verifyTelegramPayload({ ...payload, username: 'hacker' })).toBe(false)
  })

  it('returns false when auth_date is stale (> 1 day old)', () => {
    const staleDate = Math.floor(Date.now() / 1000) - 90000 // 25 hours ago
    const fields = {
      id: '123456789',
      first_name: 'Test',
      username: 'testuser',
      auth_date: String(staleDate),
    }
    const dataCheckString = Object.keys(fields)
      .sort()
      .map(k => `${k}=${fields[k as keyof typeof fields]}`)
      .join('\n')
    const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest()
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
    expect(verifyTelegramPayload({ ...fields, hash })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --testPathPattern=auth.test
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Write session config**

Create `lib/session.ts`:

```typescript
import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId: string
  telegramId: number
  telegramUsername?: string
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'ft_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}
```

- [ ] **Step 4: Write `lib/auth.ts`**

```typescript
import crypto from 'crypto'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from './session'

export function verifyTelegramPayload(data: Record<string, string>): boolean {
  const { hash, ...fields } = data

  // Check auth_date is within last 24 hours
  const authDate = parseInt(fields.auth_date, 10)
  if (Date.now() / 1000 - authDate > 86400) return false

  const dataCheckString = Object.keys(fields)
    .sort()
    .map(key => `${key}=${fields[key]}`)
    .join('\n')

  const secretKey = crypto
    .createHash('sha256')
    .update(process.env.TELEGRAM_BOT_TOKEN!)
    .digest()

  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  return hmac === hash
}

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions)
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npm test -- --testPathPattern=auth.test
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/session.ts lib/auth.ts __tests__/lib/auth.test.ts
git commit -m "feat: add Telegram payload verification and iron-session config"
```

---

## Task 4: Auth API routes + login page

**Files:**
- Create: `app/api/auth/telegram/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/auth/page.tsx`
- Create: `components/auth/TelegramLoginButton.tsx`

- [ ] **Step 1: Write Telegram auth API route**

Create `app/api/auth/telegram/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyTelegramPayload, getSession } from '@/lib/auth'

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

  const session = await getSession()
  session.userId = user.id
  session.telegramId = Number(user.telegramId)
  session.telegramUsername = user.telegramUsername ?? undefined
  await session.save()

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write logout API route**

Create `app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST() {
  const session = await getSession()
  session.destroy()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Write TelegramLoginButton client component**

Create `components/auth/TelegramLoginButton.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

declare global {
  interface Window {
    onTelegramAuth: (user: Record<string, string>) => void
  }
}

export function TelegramLoginButton() {
  const router = useRouter()

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })
      if (res.ok) router.push('/dashboard')
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME!)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    document.getElementById('tg-widget-container')?.appendChild(script)
  }, [router])

  return <div id="tg-widget-container" />
}
```

- [ ] **Step 4: Write login page**

Create `app/auth/page.tsx`:

```tsx
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton'

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="3" y="3" width="9" height="9" rx="1.5"/>
            <rect x="16" y="3" width="9" height="9" rx="1.5"/>
            <rect x="3" y="16" width="9" height="9" rx="1.5"/>
            <rect x="16" y="16" width="9" height="9" rx="1.5"/>
          </svg>
          <span className="text-white text-xl font-semibold">Finance Tracker</span>
        </div>
        <p className="text-zinc-400 text-sm">Войдите через Telegram чтобы продолжить</p>
        <TelegramLoginButton />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/ app/auth/ components/auth/
git commit -m "feat: add Telegram auth API routes and login page"
```

---

## Task 5: Auth middleware + root redirect

**Files:**
- Create: `middleware.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write failing test for middleware logic**

Create `__tests__/middleware.test.ts`:

```typescript
// Tests the path-matching logic used by middleware
import { shouldProtect } from '@/middleware'

describe('shouldProtect', () => {
  it('protects app routes', () => {
    expect(shouldProtect('/dashboard')).toBe(true)
    expect(shouldProtect('/daily')).toBe(true)
    expect(shouldProtect('/settings')).toBe(true)
  })

  it('does not protect auth route', () => {
    expect(shouldProtect('/auth')).toBe(false)
  })

  it('does not protect API auth routes', () => {
    expect(shouldProtect('/api/auth/telegram')).toBe(false)
    expect(shouldProtect('/api/auth/logout')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --testPathPattern=middleware.test
```

Expected: FAIL — `Cannot find module '@/middleware'`

- [ ] **Step 3: Write middleware**

Create `middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

// Exported for unit testing of path logic
export function shouldProtect(pathname: string): boolean {
  if (pathname.startsWith('/api/auth')) return false
  if (pathname.startsWith('/auth')) return false
  if (pathname.startsWith('/_next')) return false
  if (pathname.startsWith('/favicon')) return false
  return true
}

export async function middleware(req: NextRequest) {
  if (!shouldProtect(req.nextUrl.pathname)) return NextResponse.next()

  // iron-session cookies are encrypted with SESSION_SECRET — presence check is sufficient.
  // Full session validation happens in server components via getSession().
  const sessionCookie = req.cookies.get('ft_session')
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test -- --testPathPattern=middleware.test
```

Expected: PASS (3 tests)

- [ ] **Step 5: Write root redirect**

Replace `app/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 6: Commit**

```bash
git add middleware.ts app/page.tsx __tests__/middleware.test.ts
git commit -m "feat: add auth middleware and root redirect to dashboard"
```

---

## Task 6: App shell + sidebar

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/AppShell.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write Sidebar component**

Create `components/layout/Sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Дашборд',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/daily',
    label: 'Ежедневные',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/>
      </svg>
    ),
  },
  {
    href: '/recurring',
    label: 'Регулярные',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 8a6 6 0 1 0 12 0"/><path d="M14 8a6 6 0 0 0-6-6"/><path d="M11 5l3-3-3-3"/>
      </svg>
    ),
  },
  {
    href: '/goals',
    label: 'Цели',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2"/>
      </svg>
    ),
  },
  {
    href: '/capital',
    label: 'Капитал',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="12" height="9" rx="1.5"/><path d="M5 5V3.5a3 3 0 0 1 6 0V5"/>
      </svg>
    ),
  },
  {
    href: '/investments',
    label: 'Инвестиции',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="1,11 5,6 9,8 15,3"/>
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth')
  }

  return (
    <aside className="w-[180px] min-h-screen bg-zinc-900 flex flex-col gap-0.5 px-3 py-4 flex-shrink-0">
      <div className="flex items-center gap-2 px-2 mb-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
          <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
          <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
        </svg>
        <span className="text-white text-sm font-bold">Finance</span>
      </div>

      {NAV_ITEMS.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors ${
              active
                ? 'bg-indigo-500/30 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}

      <div className="mt-auto">
        <Link
          href="/settings"
          className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors ${
            pathname.startsWith('/settings')
              ? 'bg-indigo-500/30 text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/>
          </svg>
          Настройки
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3"/><polyline points="11,11 14,8 11,5"/><line x1="14" y1="8" x2="6" y2="8"/>
          </svg>
          Выйти
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Write AppShell**

Create `components/layout/AppShell.tsx`:

```tsx
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Update root layout to use AppShell conditionally**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = { title: 'Finance Tracker' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.className} bg-zinc-950 text-white`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Write Sidebar render test**

Create `__tests__/components/Sidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/layout/Sidebar'

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn() }),
}))

describe('Sidebar', () => {
  it('renders all navigation items', () => {
    render(<Sidebar />)
    expect(screen.getByText('Дашборд')).toBeInTheDocument()
    expect(screen.getByText('Ежедневные')).toBeInTheDocument()
    expect(screen.getByText('Регулярные')).toBeInTheDocument()
    expect(screen.getByText('Цели')).toBeInTheDocument()
    expect(screen.getByText('Капитал')).toBeInTheDocument()
    expect(screen.getByText('Инвестиции')).toBeInTheDocument()
    expect(screen.getByText('Настройки')).toBeInTheDocument()
  })

  it('marks the active route', () => {
    render(<Sidebar />)
    const dashboardLink = screen.getByText('Дашборд').closest('a')
    expect(dashboardLink).toHaveClass('bg-indigo-500/30')
  })
})
```

- [ ] **Step 5: Run Sidebar test**

```bash
npm test -- --testPathPattern=Sidebar.test
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add components/layout/ __tests__/components/
git commit -m "feat: add Sidebar and AppShell layout components"
```

---

## Task 7: Page shells + Settings

**Files:**
- Create: `app/dashboard/layout.tsx` (wraps all app pages in AppShell)
- Create: `app/dashboard/page.tsx`
- Create: `app/daily/page.tsx`
- Create: `app/recurring/page.tsx`
- Create: `app/goals/page.tsx`
- Create: `app/capital/page.tsx`
- Create: `app/investments/page.tsx`
- Create: `app/settings/page.tsx`
- Create: `app/settings/actions.ts`

- [ ] **Step 1: Create shared app layout with AppShell**

Create `app/dashboard/layout.tsx` — but we want AppShell around all app routes, not just dashboard. Create a route group instead.

Rename/restructure: create `app/(app)/layout.tsx`:

```tsx
import { AppShell } from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
```

Move all app pages under `app/(app)/` route group. Route group parentheses are ignored in URLs — `/dashboard` still works.

Directory structure:
```
app/
├── (app)/
│   ├── layout.tsx          ← AppShell wrapper
│   ├── dashboard/page.tsx
│   ├── daily/page.tsx
│   ├── recurring/page.tsx
│   ├── goals/page.tsx
│   ├── capital/page.tsx
│   ├── investments/page.tsx
│   └── settings/
│       ├── page.tsx
│       └── actions.ts
├── auth/page.tsx
├── api/...
├── layout.tsx
└── page.tsx
```

- [ ] **Step 2: Create placeholder pages**

Create `app/(app)/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return <div className="p-6"><h1 className="text-xl font-semibold">Дашборд</h1><p className="text-zinc-400 text-sm mt-1">Coming in Plan 2</p></div>
}
```

Create `app/(app)/daily/page.tsx`:

```tsx
export default function DailyPage() {
  return <div className="p-6"><h1 className="text-xl font-semibold">Ежедневные расходы</h1><p className="text-zinc-400 text-sm mt-1">Coming in Plan 2</p></div>
}
```

Create `app/(app)/recurring/page.tsx`:

```tsx
export default function RecurringPage() {
  return <div className="p-6"><h1 className="text-xl font-semibold">Регулярные платежи</h1><p className="text-zinc-400 text-sm mt-1">Coming in Plan 2</p></div>
}
```

Create `app/(app)/goals/page.tsx`:

```tsx
export default function GoalsPage() {
  return <div className="p-6"><h1 className="text-xl font-semibold">Цели</h1><p className="text-zinc-400 text-sm mt-1">Coming in Plan 2</p></div>
}
```

Create `app/(app)/capital/page.tsx`:

```tsx
export default function CapitalPage() {
  return <div className="p-6"><h1 className="text-xl font-semibold">Капитал</h1><p className="text-zinc-400 text-sm mt-1">Coming in Plan 2</p></div>
}
```

Create `app/(app)/investments/page.tsx`:

```tsx
export default function InvestmentsPage() {
  return <div className="p-6"><h1 className="text-xl font-semibold">Инвестиции</h1><p className="text-zinc-400 text-sm mt-1">Coming in Plan 3</p></div>
}
```

- [ ] **Step 3: Write Settings server action**

Create `app/(app)/settings/actions.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateBaseCurrency(formData: FormData) {
  const currency = formData.get('currency') as string
  const SUPPORTED = ['EUR', 'USD', 'RUB', 'GBP', 'CHF']
  if (!SUPPORTED.includes(currency)) throw new Error('Unsupported currency')

  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.user.update({
    where: { id: session.userId },
    data: { baseCurrency: currency },
  })

  revalidatePath('/settings')
}
```

- [ ] **Step 4: Write Settings page**

Create `app/(app)/settings/page.tsx`:

```tsx
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { updateBaseCurrency } from './actions'

const CURRENCIES = ['EUR', 'USD', 'RUB', 'GBP', 'CHF']

export default async function SettingsPage() {
  const session = await getSession()
  const user = await db.user.findUnique({ where: { id: session.userId } })

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6">Настройки</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Telegram аккаунт</h2>
        <div className="bg-zinc-900 rounded-lg p-4 text-sm">
          <span className="text-zinc-300">@{user?.telegramUsername ?? '—'}</span>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Основная валюта</h2>
        <form action={updateBaseCurrency}>
          <div className="flex gap-2 flex-wrap mb-3">
            {CURRENCIES.map(c => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="currency" value={c} defaultChecked={user?.baseCurrency === c} className="sr-only" />
                <span className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  user?.baseCurrency === c
                    ? 'bg-indigo-500/30 border-indigo-500/50 text-white'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}>{c}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-500/40 hover:bg-indigo-500/60 rounded-md text-xs font-medium transition-colors">
            Сохранить
          </button>
        </form>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Write test for updateBaseCurrency action**

Create `__tests__/app/settings/actions.test.ts`:

```typescript
// Mock Prisma and session before importing the action
jest.mock('@/lib/db', () => ({
  db: { user: { update: jest.fn().mockResolvedValue({}) } },
}))
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ userId: 'user_1' }),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { updateBaseCurrency } from '@/app/(app)/settings/actions'
import { db } from '@/lib/db'

function makeFormData(currency: string) {
  const fd = new FormData()
  fd.append('currency', currency)
  return fd
}

describe('updateBaseCurrency', () => {
  it('updates the user base currency', async () => {
    await updateBaseCurrency(makeFormData('USD'))
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { baseCurrency: 'USD' },
    })
  })

  it('throws for unsupported currency', async () => {
    await expect(updateBaseCurrency(makeFormData('XYZ'))).rejects.toThrow('Unsupported currency')
  })
})
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: PASS (all test suites)

- [ ] **Step 7: Final commit**

```bash
git add app/ components/ __tests__/
git commit -m "feat: add page shells, AppShell route group layout, and Settings page"
```

---

## Verification

After completing all tasks, verify the full foundation works:

```bash
npm run dev
```

1. Visit `http://localhost:3000` → redirects to `/dashboard`
2. Middleware intercepts → redirects to `/auth`
3. Login page shows Telegram button (needs real bot token to function)
4. After auth → sidebar visible, all 6 nav items navigate correctly
5. `/settings` shows currency selector and Telegram username
6. `npm test` — all tests pass

---

## What's Next

- **Plan 2:** Dashboard, daily expenses (web), recurring payments, goals, capital
- **Plan 3:** Investments with Binance/MOEX/Yahoo price APIs + Telegram bot for expense entry
