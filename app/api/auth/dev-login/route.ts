import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// DEV ONLY — bypasses Telegram auth to log in as the seed demo user
// This route only works in development mode
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const user = await db.user.findFirst({
    where: { telegramId: 999999999 },
  })

  if (!user) {
    return NextResponse.json({ error: 'Demo user not found — run: npx tsx prisma/seed.ts' }, { status: 404 })
  }

  const session = await getSession()
  session.userId = user.id
  session.telegramUsername = user.telegramUsername ?? undefined
  await session.save()

  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
}
