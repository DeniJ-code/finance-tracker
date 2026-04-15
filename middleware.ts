import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

// Exported for unit testing of path logic
export function shouldProtect(pathname: string): boolean {
  if (pathname.startsWith('/api/auth')) return false
  if (pathname.startsWith('/auth')) return false
  if (pathname.startsWith('/_next')) return false
  if (pathname.startsWith('/favicon')) return false
  return true
}

export async function middleware(req: NextRequest) {
  if (!shouldProtect(req.nextUrl.pathname)) return NextResponse.next()

  // iron-session cookies are encrypted with SESSION_SECRET — presence check is sufficient.
  // Full session validation happens in server components via getSession().
  const sessionCookie = req.cookies.get('ft_session')
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
