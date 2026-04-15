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
