'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
        <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/daily',
    label: 'Daily',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/>
      </svg>
    ),
  },
  {
    href: '/recurring',
    label: 'Recurring',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 8a6 6 0 1 0 12 0"/><path d="M14 8a6 6 0 0 0-6-6"/><path d="M11 5l3-3-3-3"/>
      </svg>
    ),
  },
  {
    href: '/goals',
    label: 'Goals',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2"/>
      </svg>
    ),
  },
  {
    href: '/capital',
    label: 'Capital',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="12" height="9" rx="1.5"/><path d="M5 5V3.5a3 3 0 0 1 6 0V5"/>
      </svg>
    ),
  },
  {
    href: '/investments',
    label: 'Investments',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="1,11 5,6 9,8 15,3"/>
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth')
  }

  return (
    <aside className="w-[180px] min-h-screen bg-zinc-900 border-r border-white/[0.04] flex flex-col gap-0.5 px-3 py-4 flex-shrink-0">
      <div className="flex items-center gap-2 px-2 mb-4 pb-4 border-b border-white/[0.06]">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
          <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
          <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
        </svg>
        <span className="text-white text-sm font-bold tracking-tight">Finance</span>
      </div>

      {NAV_ITEMS.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 py-2 rounded-md text-xs transition-colors active:scale-[0.97] ${
              active
                ? 'bg-indigo-500/15 text-white font-semibold border-l-2 border-indigo-400 pl-2 pr-2.5'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-2.5'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}

      <div className="mt-auto">
        <div className="h-px bg-white/[0.06] mx-1 mb-2" />
        <Link
          href="/settings"
          className={`flex items-center gap-2 py-2 rounded-md text-xs transition-colors active:scale-[0.97] ${
            pathname.startsWith('/settings')
              ? 'bg-indigo-500/15 text-white font-semibold border-l-2 border-indigo-400 pl-2 pr-2.5'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-2.5'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/>
          </svg>
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors active:scale-[0.97]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3"/><polyline points="11,11 14,8 11,5"/><line x1="14" y1="8" x2="6" y2="8"/>
          </svg>
          Log out
        </button>
      </div>
    </aside>
  )
}
