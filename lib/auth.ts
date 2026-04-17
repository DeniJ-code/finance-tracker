import crypto from 'crypto'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from './session'

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set')
}

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
