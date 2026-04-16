'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createAccount(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const type = (formData.get('type') as string) || 'debit'
  const balance = parseFloat(formData.get('balance') as string) || 0
  const currency = (formData.get('currency') as string) || 'EUR'
  const color = (formData.get('color') as string) || '#5a68a8'

  if (!name) throw new Error('Name required')

  await db.account.create({
    data: { userId: session.userId, name, type, balance, currency, color },
  })
  revalidatePath('/capital')
}

export async function updateAccount(id: string, formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const type = (formData.get('type') as string) || 'debit'
  const balance = parseFloat(formData.get('balance') as string) || 0
  const currency = (formData.get('currency') as string) || 'EUR'
  const color = (formData.get('color') as string) || '#5a68a8'

  if (!name) throw new Error('Name required')

  await db.account.updateMany({
    where: { id, userId: session.userId },
    data: { name, type, balance, currency, color },
  })
  revalidatePath('/capital')
}

export async function deleteAccount(id: string) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.account.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/capital')
}
