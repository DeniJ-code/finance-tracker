import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { updateBaseCurrency } from './actions'
import { SUPPORTED_CURRENCIES } from '@/lib/format'

export default async function SettingsPage() {
  const session = await getSession()
  const user = await db.user.findUnique({ where: { id: session.userId } })

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6">Настройки</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Telegram аккаунт</h2>
        <div className="bg-zinc-900 rounded-lg p-4 text-sm">
          <span className="text-zinc-300">@{user?.telegramUsername ?? '—'}</span>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Основная валюта</h2>
        <form action={updateBaseCurrency}>
          <div className="flex gap-2 flex-wrap mb-3">
            {SUPPORTED_CURRENCIES.map(c => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="currency" value={c} defaultChecked={user?.baseCurrency === c} className="sr-only" />
                <span className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  user?.baseCurrency === c
                    ? 'bg-indigo-500/30 border-indigo-500/50 text-white'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}>{c}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-500/40 hover:bg-indigo-500/60 rounded-md text-xs font-medium transition-colors">
            Сохранить
          </button>
        </form>
      </section>
    </div>
  )
}
