import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, SessionData } from './types';

export const SESSION_COOKIE_NAME = 'cadence_auth_session';
const SECRET = process.env.AUTH_SECRET || 'cadence-secret-salt-development-key-32b';

export const COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24 hours
};

// Edge-safe Base64URL encoding/decoding
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function signData(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Encodes session data and signs it with HMAC-SHA256
 */
export async function encodeSession(session: SessionData): Promise<string> {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = await signData(payload);
  return `${payload}.${signature}`;
}

/**
 * Decodes and verifies the signature of a session token
 */
export async function decodeSession(cookieValue?: string): Promise<SessionData | null> {
  if (!cookieValue) return null;
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const expectedSignature = await signData(payload);

    if (signature !== expectedSignature) {
      console.warn('Tampered session token rejected.');
      return null;
    }

    const json = fromBase64Url(payload);
    const session: SessionData = JSON.parse(json);

    // Check expiration
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }
    return session;
  } catch {
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
    const session = await decodeSession(cookie?.value);
    return session?.user || null;
  } catch {
    return null;
  }
}

/**
 * Helper to inspect the current session from a NextRequest
 */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionData | null> {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  return decodeSession(cookie?.value);
}

/**
 * Attach the session cookie to a NextResponse
 */
export async function setSessionCookie(response: NextResponse, session: SessionData): Promise<NextResponse> {
  const token = await encodeSession(session);
  response.cookies.set({
    ...COOKIE_OPTIONS,
    value: token,
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
