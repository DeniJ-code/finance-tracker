'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

declare global {
  interface Window {
    onTelegramAuth: (user: Record<string, string>) => void
  }
}

export function TelegramLoginButton() {
  const router = useRouter()

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })
      if (res.ok) router.push('/dashboard')
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME!)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    document.getElementById('tg-widget-container')?.appendChild(script)
  }, [router])

  return <div id="tg-widget-container" />
}
