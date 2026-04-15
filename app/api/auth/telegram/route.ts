import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyTelegramPayload, getSession } from '@/lib/auth'
import { ensureDefaultCategories } from '@/lib/categories'

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!verifyTelegramPayload(body)) {
    return NextResponse.json({ error: 'Invalid Telegram payload' }, { status: 401 })
  }

  const telegramId = BigInt(body.id)

  const user = await db.user.upsert({
    where: { telegramId },
    update: { telegramUsername: body.username ?? null },
    create: {
      telegramId,
      telegramUsername: body.username ?? null,
      baseCurrency: 'EUR',
    },
  })

  try {
    await ensureDefaultCategories(user.id)
  } catch (err) {
    console.error('ensureDefaultCategories failed:', err)
  }

  const session = await getSession()
  session.userId = user.id
  session.telegramId = Number(user.telegramId)
  session.telegramUsername = user.telegramUsername ?? undefined
  await session.save()

  return NextResponse.json({ ok: true })
}
