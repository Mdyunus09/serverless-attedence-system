import { NextResponse } from 'next/server';
import { getAdminReportSummary } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can access institutional reports.' }, { status: 403 });
    }

    const report = await getAdminReportSummary();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

