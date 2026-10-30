import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs = await getAuditLogs();
  return NextResponse.json({ logs });
}
