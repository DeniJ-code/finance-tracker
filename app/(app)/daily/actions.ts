'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createDailyExpense(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const amount = parseFloat(formData.get('amount') as string)
  const categoryId = formData.get('categoryId') as string
  const note = (formData.get('note') as string) || null
  const currency = (formData.get('currency') as string) || 'EUR'

  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount')
  if (!categoryId) throw new Error('Category required')

  await db.dailyExpense.create({
    data: { userId: session.userId, amount, currency, categoryId, note, source: 'web' },
  })
  revalidatePath('/daily')
}

export async function deleteDailyExpense(id: string) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.dailyExpense.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/daily')
}
