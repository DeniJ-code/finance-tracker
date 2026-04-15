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
  const rate = rates[currency]
  if (rate === undefined) {
    // Rate not available for this currency; returning amount unchanged as fallback.
    // Callers should validate that required currencies are present in the rates map.
    return amount
  }
  return amount / rate
}
