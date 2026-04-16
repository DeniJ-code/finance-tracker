'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { SUPPORTED_CURRENCIES } from '@/lib/format'

const ALLOWED_COLORS = ['#5a68a8', '#5a8a60', '#a3845a', '#a85a8a', '#8a5a5a', '#6366f1', '#9ca3af']

export async function createAccount(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const type = (formData.get('type') as string) || 'debit'
  const balance = parseFloat(formData.get('balance') as string) || 0
  const currency = (formData.get('currency') as string) || 'EUR'
  const color = (formData.get('color') as string) || ALLOWED_COLORS[0]

  if (!name) throw new Error('Name required')
  if (!['debit', 'savings', 'cash', 'other'].includes(type)) throw new Error('Invalid type')
  if (!SUPPORTED_CURRENCIES.includes(currency)) throw new Error('Invalid currency')
  if (!ALLOWED_COLORS.includes(color)) throw new Error('Invalid color')

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
  const color = (formData.get('color') as string) || ALLOWED_COLORS[0]

  if (!name) throw new Error('Name required')
  if (!['debit', 'savings', 'cash', 'other'].includes(type)) throw new Error('Invalid type')
  if (!SUPPORTED_CURRENCIES.includes(currency)) throw new Error('Invalid currency')
  if (!ALLOWED_COLORS.includes(color)) throw new Error('Invalid color')

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
