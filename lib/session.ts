import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId?: string
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
