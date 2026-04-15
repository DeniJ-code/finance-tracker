// Tests the path-matching logic used by middleware
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: { next: jest.fn(), redirect: jest.fn() },
}))
jest.mock('iron-session', () => ({ getIronSession: jest.fn() }))

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
