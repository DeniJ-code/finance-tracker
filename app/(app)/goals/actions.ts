'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function parseGoalFields(formData: FormData) {
  const name = formData.get('name') as string
  const category = (formData.get('category') as string) || null
  const type = formData.get('type') as string
  const targetAmount = parseFloat(formData.get('targetAmount') as string)
  const currentAmount = parseFloat(formData.get('currentAmount') as string) || 0
  const currency = (formData.get('currency') as string) || 'EUR'
  const deadline = new Date(formData.get('deadline') as string)
  const description = (formData.get('description') as string) || null

  if (!name) throw new Error('Name required')
  if (!['short', 'long'].includes(type)) throw new Error('Invalid type')
  if (isNaN(targetAmount) || targetAmount <= 0) throw new Error('Invalid target amount')
  if (isNaN(deadline.getTime())) throw new Error('Invalid deadline')

  return { name, category, type, targetAmount, currentAmount, currency, deadline, description }
}

export async function createGoal(formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const data = parseGoalFields(formData)
  await db.goal.create({ data: { userId: session.userId, ...data } })
  revalidatePath('/goals')
}

export async function updateGoal(id: string, formData: FormData) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  const data = parseGoalFields(formData)
  await db.goal.updateMany({ where: { id, userId: session.userId }, data })
  revalidatePath('/goals')
}

export async function deleteGoal(id: string) {
  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.goal.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/goals')
}
