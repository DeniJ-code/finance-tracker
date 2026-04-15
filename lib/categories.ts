import { db } from '@/lib/db'

export const DEFAULT_CATEGORIES = [
  { name: 'Food', color: '#5a8a60' },
  { name: 'Groceries', color: '#5a68a8' },
  { name: 'Transport', color: '#a3845a' },
  { name: 'Health', color: '#a85a8a' },
  { name: 'Entertainment', color: '#8a5a5a' },
  { name: 'Other', color: '#9ca3af' },
]

export async function ensureDefaultCategories(userId: string): Promise<void> {
  const count = await db.category.count({ where: { userId } })
  if (count > 0) return
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId })),
  })
}
