import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton'

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="3" y="3" width="9" height="9" rx="1.5"/>
            <rect x="16" y="3" width="9" height="9" rx="1.5"/>
            <rect x="3" y="16" width="9" height="9" rx="1.5"/>
            <rect x="16" y="16" width="9" height="9" rx="1.5"/>
          </svg>
          <span className="text-white text-xl font-semibold">Finance Tracker</span>
        </div>
        <p className="text-zinc-400 text-sm">Sign in with Telegram to continue</p>
        <TelegramLoginButton />
      </div>
    </div>
  )
}
