import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'cadence_auth_session';

function decodeSession(cookieValue?: string) {
  if (!cookieValue) return null;
  try {
    let json: string;
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(cookieValue, 'base64').toString('utf-8');
    } else {
      json = atob(cookieValue);
    }
    const session = JSON.parse(json);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public assets and auth API endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  const session = decodeSession(cookie?.value);
  const isAuthenticated = Boolean(session?.user);

  // 2. Handle /login page
  if (pathname === '/login') {
    if (isAuthenticated) {
      // If already logged in, redirect to appropriate role portal
      if (session.user.role === 'student') {
        return NextResponse.redirect(new URL('/student-portal', req.url));
      }
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 3. Unauthenticated users -> Redirect to /login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  // 4. Role-based route authorization
  // Students accessing the instructor dashboard root '/' are redirected to their Student Portal
  if (pathname === '/' && role === 'student') {
    return NextResponse.redirect(new URL('/student-portal', req.url));
  }

  // Admin-only API routes
  if (pathname.startsWith('/api/db/config') && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

