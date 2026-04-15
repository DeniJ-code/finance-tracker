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
