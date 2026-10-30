import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, SessionData, UserRole } from './types';

export const SESSION_COOKIE_NAME = 'cadence_auth_session';

// Cookie options for secure serverless session management
export const COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24 hours
};

/**
 * Encodes session data for storage in an httpOnly cookie
 */
export function encodeSession(session: SessionData): string {
  const json = JSON.stringify(session);
  return Buffer.from(json).toString('base64');
}

/**
 * Decodes session data from a cookie string
 */
export function decodeSession(cookieValue?: string): SessionData | null {
  if (!cookieValue) return null;
  try {
    const json = Buffer.from(cookieValue, 'base64').toString('utf-8');
    const session: SessionData = JSON.parse(json);
    // Check expiration
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

/**
 * Server-side helper to get the current authenticated user in Server Components and Route Handlers
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    const session = decodeSession(cookie?.value);
    return session?.user || null;
  } catch {
    return null;
  }
}

/**
 * Helper to inspect the current session from a NextRequest (usable in middleware & route handlers)
 */
export function getSessionFromRequest(req: NextRequest): SessionData | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  return decodeSession(cookie?.value);
}

/**
 * Attach the session cookie to a NextResponse
 */
export function setSessionCookie(response: NextResponse, session: SessionData): NextResponse {
  response.cookies.set({
    ...COOKIE_OPTIONS,
    value: encodeSession(session),
  });
  return response;
}

/**
 * Clear the session cookie (logout)
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    ...COOKIE_OPTIONS,
    value: '',
    maxAge: 0,
  });
  return response;
}

