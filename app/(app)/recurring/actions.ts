'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function parsePaymentFields(formData: FormData) {
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const amount = parseFloat(formData.get('amount') as string)
  const currency = (formData.get('currency') as string) || 'EUR'
  const frequencyPerYear = parseInt(formData.get('frequencyPerYear') as string, 10)
  const category = (formData.get('category') as string) || null
  const status = (formData.get('status') as string) || 'active'
  const nextPaymentDateStr = formData.get('nextPaymentDate') as string
  const nextPaymentDate = nextPaymentDateStr ? new Date(nextPaymentDateStr) : null
  const notes = (formData.get('notes') as string) || null

  if (!name) throw new Error('Name required')
  if (!['expense', 'income', 'subscription'].includes(type)) throw new Error('Invalid type')
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount')
  if (isNaN(frequencyPerYear) || frequencyPerYear <= 0) throw new Error('Invalid frequency')

  return { name, type, amount, currency, frequencyPerYear, category, status, nextPaymentDate, notes }
}

export async function createRecurringPayment(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const data = parsePaymentFields(formData)
  await db.recurringPayment.create({ data: { userId: session.userId, ...data } })
  revalidatePath('/recurring')
}

export async function updateRecurringPayment(id: string, formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const data = parsePaymentFields(formData)
  await db.recurringPayment.updateMany({ where: { id, userId: session.userId }, data })
  revalidatePath('/recurring')
}

export async function deleteRecurringPayment(id: string) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.recurringPayment.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/recurring')
}
