# Finance Tracker — Design Spec
**Date:** 2026-04-15  
**Status:** Approved

---

## Overview

A personal finance web application for a single user. Combines regular income/expenses, subscriptions, financial goals, savings, investments, and daily expense tracking in one interface. The system automatically calculates monthly and annual totals, shows how much to save per month to reach each goal, and tracks current capital across accounts.

Daily expenses are primarily entered via Telegram bot; the web interface handles everything else and provides full analytics.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Single project, server components, API routes — optimal for solo developer |
| Database | PostgreSQL + Prisma ORM | Relational data with foreign keys; Prisma provides type safety |
| Auth | Telegram Login Widget (web) + Telegram bot token verification | Personal tool — no email/password registration system needed |
| Telegram bot | Grammy (Node.js) | Separate process, connects to same DB |
| Price APIs | Binance/MEXC/Kraken/Bybit (crypto), MOEX (RU stocks), Yahoo Finance (global stocks) | Free, well-documented, covers all asset types |
| Hosting | Any VPS (Railway, Render, or self-hosted) | Bot needs persistent process |

---

## Design Rules

- **Font:** Inter everywhere, no exceptions
- **Icons:** SVG glyphs only — no emoji
- **Text casing:** No words written entirely in uppercase
- **Category colors:** Muted, desaturated palette (earth tones) — small dot indicator + quiet gray label text. No bright color chips or badges
- **Color accents:** Indigo (`#6366f1`) as primary accent; green (`#5a8a60`), blue-gray (`#5a68a8`), amber (`#a3845a`), mauve (`#a85a8a`) for categories/accounts
- **Theme:** Dark background throughout

---

## Navigation

Fixed sidebar (left, 180px wide) with sections:

1. Dashboard
2. Daily expenses
3. Regular payments
4. Goals
5. Capital
6. Investments
7. Settings (bottom)

---

## Sections

### 1. Dashboard

Main overview screen. Visible at a glance without scrolling.

**Top row — 4 KPI cards:**
- Total capital (sum of all accounts)
- Expenses per month (fixed + subscriptions)
- Income per month (from recurring income entries)
- Monthly savings toward goals (sum of all active goal contributions)

**Middle row — 2 panels:**
- Goal progress: progress bars for each active goal, showing % and amounts
- Upcoming payments: next 4–5 recurring expenses/subscriptions sorted by days remaining, with date and amount

**Bottom row:**
- Recent daily expenses: today's entries as small tiles, plus a quick-add button

---

### 2. Daily Expenses

Coin Keeper-style expense log.

**Layout:** Two-column — left: chronological feed; right: quick-add panel + monthly category breakdown.

**Feed (left):**
- Grouped by day with day header showing date and daily total
- Each row: category dot (muted color) · name · category label (quiet, right-aligned) · time · amount
- Month navigation (prev/next arrows) with month total shown

**Quick add (right):**
- Large amount input field
- Category grid (tap to select): Food, Groceries, Transport, Health, Entertainment, Other
- Optional note field
- Save button

**Category breakdown (right, below quick add):**
- Current month totals per category
- Mini horizontal progress bars relative to largest category

**Telegram bot input:**
- Parsing format: `[amount] [note]` — e.g. `3.50 кофе` or `кофе 3.50`
- Bot replies with confirmation: name, amount, detected category
- If category is ambiguous, bot asks to confirm from a short inline keyboard
- Entry appears in the web feed immediately

---

### 3. Regular Payments

Table of all recurring income and expenses, mirroring the existing Notion structure.

**Summary bar (top):** 4 cards — annual expenses, monthly expenses, annual income, monthly income.

**Filter tabs:** All · Expenses · Income · Subscriptions

**Table columns:**
- Type (expense / income / subscription) — shown as a small muted tag
- Name
- Amount per payment
- Frequency per year
- Annual total (auto-calculated)
- Monthly total (auto-calculated: amount × frequency ÷ 12)
- Status (Active / Cancelled)
- Next payment date (for subscriptions and dated expenses)

**Cancelled entries** are shown struck-through and dimmed.

**Add/edit:** Modal with all fields. Next payment date is optional; if provided, days-until-payment is calculated automatically.

---

### 4. Goals

Financial goals with progress tracking and auto-calculated monthly savings requirement.

**Summary bar (top):** Total goals count, total monthly savings needed, total amount saved.

**Filter:** Active · All · Completed

**Goal cards:**
- Left border color indicates progress state (indigo: in progress, green: close to target, amber: behind)
- Header: name + type tag (short-term / long-term) + category tag
- Description line
- Right: current amount / target amount, required monthly saving, months remaining
- Progress bar with gradient matching border color
- Footer: percentage, amount saved, amount remaining, deadline

**Monthly saving calculation:** `(target - current) ÷ months_until_deadline`. Recalculates live as current amount is updated.

**Add/edit:** Modal with fields — name, category, type, target amount, current amount, deadline date, description.

---

### 5. Capital

Manual account balances representing current net worth (excluding investments).

**Total capital card (top):** Sum of all accounts, number of accounts, last updated timestamp. Add account button (top right).

**Account cards (grid, 3 columns):**
- Top border in account's assigned color
- Name, balance, type (debit / savings / cash / other), last updated date
- Edit button (pencil icon) to update balance

**Distribution bar (bottom):** Horizontal segmented bar showing share of each account, with legend.

**Currencies:** Each account stores its own currency; totals are converted to a base currency (set in Settings). Exchange rates fetched from a free API (e.g. exchangerate.host).

**Add account modal fields:** Name, type, balance, currency, color.

---

### 6. Investments

Portfolio of investment positions with automatic price updates.

**KPI cards (top):** Portfolio total (current value), amount invested (purchase price total), unrealised gain/loss (amount + %), planned monthly contribution.

**Filter tabs:** All · Broker · Crypto · Other

**Position list rows:**
- Category dot (muted color) · name · type + source label · current value · gain/loss (amount + %)

**Price sources by asset type:**
- **Crypto:** user selects exchange at position creation (Binance, MEXC, Kraken, Bybit). Stores coin ticker (e.g. `BTC`). Price fetched via exchange public REST API.
- **Russian stocks:** MOEX Open API. Stores ticker (e.g. `SBER`).
- **Global stocks/ETFs:** Yahoo Finance. Stores ticker (e.g. `VOO`).
- **Manual:** No API. User updates value themselves.

**Stored per position:** name, asset type, exchange/source, ticker, quantity (number of units), purchase price per unit, purchase date.

**Current value calculation:** quantity × current price (fetched). Price refresh: on page load + background refresh every 30 minutes.

**Distribution bar (bottom):** Same segmented bar pattern as Capital section.

**Add position modal fields:** Name, type, exchange/source, ticker, quantity, purchase price per unit, purchase date.

---

### 7. Settings

- Base currency selection
- Telegram account info (connected account, disconnect option)
- Category management: add/rename/reorder/delete categories, assign muted color
- Data export (CSV)

---

## Data Model

```
User
  id, telegram_id, telegram_username, base_currency, created_at

Account
  id, user_id, name, type, balance, currency, color, updated_at

RecurringPayment
  id, user_id, name, type (expense|income|subscription), amount, currency,
  frequency_per_year, status (active|cancelled), next_payment_date,
  category (free-form string, e.g. "Software", "Lifestyle"), notes

Goal
  id, user_id, name, category (free-form string), type (short|long),
  target_amount, current_amount, currency, deadline, description, created_at

DailyExpense
  id, user_id, amount, currency, category_id (FK → Category), note,
  source (web|bot), created_at

Category  -- used only by DailyExpense; RecurringPayment and Goal use free-form strings
  id, user_id, name, color

Investment
  id, user_id, name, asset_type (crypto|stock_ru|stock_world|manual),
  exchange, ticker, quantity, purchase_price_per_unit, purchase_date, currency,
  monthly_contribution (optional — planned monthly top-up amount)
```

---

## Telegram Bot

**Auth flow:**
1. User opens web app → clicks "Login via Telegram"
2. Telegram Login Widget opens → user approves
3. Widget sends signed payload to Next.js API route → verified with bot token → session created

**Expense entry flow:**
1. User sends message to bot: `3.50 кофе` or `кофе 3.50`
2. Bot parses amount + note, attempts category detection from keyword matching
3. If category is clear → saves, replies with confirmation
4. If ambiguous → bot sends inline keyboard with 3–4 category options
5. User taps category → saved, confirmed

**Bot commands:**
- `/start` — welcome + link to web app
- `/today` — today's total spending
- `/month` — current month total by category
- `/balance` — capital summary (accounts)

---

## Key Calculations

| Metric | Formula |
|---|---|
| Monthly cost of recurring payment | `amount × frequency_per_year ÷ 12` |
| Annual cost | `amount × frequency_per_year` |
| Free cash per month | `total_monthly_income − total_monthly_expenses − total_goal_contributions` |
| Goal monthly requirement | `(target − current) ÷ months_until_deadline` |
| Investment gain/loss | `(current_price × quantity) − (purchase_price × quantity)` |
| Total capital | `sum(account balances, converted to base currency)` |

---

## Out of Scope

- Multi-user / family sharing
- Bank import / Open Banking
- Push notifications / spending alerts
- Budget limits per category
- Recurring expense auto-marking as paid
