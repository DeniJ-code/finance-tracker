# Gotchas — Finance Tracker

Project pitfalls and a log of past agent mistakes. Updated after each working session.

---

## Architecture

### Single source of truth for currencies
`SUPPORTED_CURRENCIES` lives in `lib/format.ts`. Never duplicate it — not in `actions.ts`, not in page components. `settings/actions.ts` once held its own inline array that silently diverged.

### Every KPI on the dashboard must be currency-converted
All amounts shown in `baseCurrency` must go through `convertToBase()` from `lib/exchange.ts`. This was missed three times in a row on separate KPIs: today's total, monthly expenses/income, and monthly goal savings. If you add a new KPI — conversion is mandatory.

### fetchRates must be fetched when ANY resource needs rates, not just accounts
The condition `rawAccounts.length > 0 ? await fetchRates(...) : {}` is wrong if payments or goals also need conversion. After the code review fix, the condition checks all three: `rawAccounts.length > 0 || rawPayments.length > 0 || rawGoals.length > 0`.

### Every page needs an auth guard before any DB call
Pattern used on every page — **including settings**:
```ts
const session = await getSession()
if (!session.userId) redirect('/auth')
```
`settings/page.tsx` was missing this, leaving the DB call reachable with an empty session.

### categoryId ownership must be verified before inserting a DailyExpense
`createDailyExpense` must confirm the category belongs to the authenticated user:
```ts
const category = await db.category.findFirst({ where: { id: categoryId, userId: session.userId } })
if (!category) throw new Error('Invalid category')
```
Without this, a logged-in user can attach another user's category to their expense.

### Server action validation should match the UI options
`frequencyPerYear` in recurring payments was only checked for `> 0` on the server, while the UI offers only `[1, 2, 4, 12, 26, 52]`. Server validation must match UI options — use `ALLOWED_FREQUENCIES.includes(frequencyPerYear)`.

---

## Database

### All child models need @@index([userId])
Every model that has a `userId` foreign key (`Account`, `RecurringPayment`, `Goal`, `Category`, `DailyExpense`) must have `@@index([userId])` in `schema.prisma`. Without it every page load is a full table scan. `DailyExpense` also benefits from a compound `@@index([userId, createdAt])` because the dashboard filters by date.

---

## Types & Session

### SessionData.userId must be typed as optional
`iron-session` returns every field as `undefined` on an empty session, regardless of how you type it in `SessionData`. Typing `userId: string` (non-optional) just silences TypeScript and hides the bug. Correct type: `userId?: string`.

### Don't store telegramId in the session
`session.telegramId = Number(user.telegramId)` is lossy — Telegram IDs are `BigInt` in the DB. `Number(BigInt)` silently corrupts IDs larger than `Number.MAX_SAFE_INTEGER`. Since `telegramId` is never read back from the session for any auth check, it was removed. If you need it later, store it as a `string`.

### Required env vars should throw at module load time, not silently produce wrong results
```ts
if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set')
}
```
Without this, a missing token causes a silently wrong HMAC key — every auth check passes with a corrupted signature.

---

## Testing

### next/cache must be mocked
`next/cache` does not exist in the Jest environment. Mock it in `jest.setup.ts` or per-test file.

### Clear mocks between tests
Use `jest.clearAllMocks()` or `beforeEach(() => jest.resetAllMocks())`. Without it, mock state leaks between tests.

### Set required env vars in jest.setup.ts, not in test files
Module-level startup checks (like the `TELEGRAM_BOT_TOKEN` throw) execute when the module is first imported. ES `import` statements are hoisted above regular code, so setting `process.env.X = '...'` at the top of a test file runs *after* the module has already thrown. Set env vars in `jest.setup.ts` (runs before any module loads):
```ts
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? 'test_bot_token_for_jest'
```

### db mock must include all methods called by the action
If an action now calls `db.category.findFirst`, the mock must include `category: { findFirst: jest.fn().mockResolvedValue({...}) }`. Missing methods crash with `Cannot read properties of undefined`.

---

## UI / Design

### Language is English only
All text, labels, empty states, errors — English. Sidebar, auth page subtitle, settings headings, and the logout button were once in Russian and required a separate fix commit.

### Date locale is en-GB
`formatDate` and `formatMonth` in `lib/format.ts` use `'en-GB'`. Do not change to `ru-RU`. `DailyClient` once used the Russian locale for day headers.

### No ALL CAPS
Nav labels and buttons use sentence case or Title Case. ALL CAPS is banned.

### Icons are SVG only
No emoji in UI, including empty states and placeholders.

### Category buttons must use flex-wrap, not grid
`grid-cols-3` on the quick-add category buttons truncates long names like "Entertainment". Use `flex flex-wrap` instead.

### Color presets must have human-readable names
`COLOR_PRESETS` must be `{ value: string; label: string }[]`. Without labels, `aria-label` shows hex values, which are useless for screen readers.

### Muted color palette
- Primary: Indigo `#6366f1`
- Category/account colors: `#5a8a60`, `#5a68a8`, `#a3845a`, `#a85a8a`, `#8a5a5a`, `#9ca3af`
- No bright badges — small muted dot + quiet text only

---

## Security

### Validate color input against an allowlist
Account color comes from a form field as a plain string. Always check against `ALLOWED_COLORS` in `capital/actions.ts` — otherwise CSS injection is possible via inline `style={{ backgroundColor }}`.

---

## Accessibility

### aria-labels on every interactive element without visible text
Every `<button>` without text and every `<input>` without a `<label>` needs `aria-label` or `htmlFor`. Decorative SVGs need `aria-hidden="true"`.

### Confirmation dialogs must name the item
"Delete this payment?" — bad. "Delete 'Netflix'?" — correct. The user must know exactly what they're deleting.

---

## Copywriting

### Empty states should be actionable
Not "No upcoming payments." but "No upcoming payments. Set a date on a payment to see it here."

### Pluralise time units correctly
"in 5 days", "in 1 day" (not "in 1 days"). Template: `in ${n} day${n === 1 ? '' : 's'}`.

### Amount placeholder
Use `Amount`, not `0.00`.

### Table headers must match form labels
"Next date" in the table vs "Next payment date" in the form — they must match.

---

## Tooling

### .playwright-cli/ must be in .gitignore
The Playwright CLI writes logs, snapshots, and screenshots to `.playwright-cli/`. Add it to `.gitignore` or it will pollute commits.

---

_Last updated: 2026-04-18_
