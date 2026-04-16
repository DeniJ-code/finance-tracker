'use server'

import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { SUPPORTED_CURRENCIES } from '@/lib/format'

export async function updateBaseCurrency(formData: FormData) {
  const currency = formData.get('currency') as string
  if (!SUPPORTED_CURRENCIES.includes(currency)) throw new Error('Unsupported currency')

  const session = await getSession()
  if (!session.userId) throw new Error('Not authenticated')

  await db.user.update({
    where: { id: session.userId },
    data: { baseCurrency: currency },
  })

  revalidatePath('/settings')
}
