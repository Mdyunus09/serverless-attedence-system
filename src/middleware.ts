import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'cadence_auth_session';
const SECRET = process.env.AUTH_SECRET || 'cadence-secret-salt-development-key-32b';

async function verifyAndDecodeSession(cookieValue?: string) {
  if (!cookieValue) return null;
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;

    // Verify HMAC-SHA256 signature in Edge Runtime
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const expectedSig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const bytes = new Uint8Array(expectedSig);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const computedSignature = btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    if (signature !== computedSignature) {
      return null;
    }

    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decodedBinary = atob(base64);
    const decodedBytes = new Uint8Array(decodedBinary.length);
    for (let i = 0; i < decodedBinary.length; i++) {
      decodedBytes[i] = decodedBinary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(decodedBytes);
    const session = JSON.parse(json);

    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
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
  const session = await verifyAndDecodeSession(cookie?.value);
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
