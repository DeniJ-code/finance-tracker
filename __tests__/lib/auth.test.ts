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
