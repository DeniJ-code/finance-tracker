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
