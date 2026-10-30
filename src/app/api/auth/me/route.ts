import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDatabaseStatus } from '@/lib/db';

export async function GET() {
  const [user, dbStatus] = await Promise.all([
    getCurrentUser(),
    getDatabaseStatus(),
  ]);

  return NextResponse.json({
    authenticated: Boolean(user),
    user,
    provider: dbStatus.provider,
    connected: dbStatus.connected,
  });
}
