import { NextResponse } from 'next/server';
import { getDatabaseStatus, initDatabaseSchema } from '@/lib/db';

export async function GET() {
  const status = await getDatabaseStatus();
  return NextResponse.json(status);
}

export async function POST() {
  try {
    const result = await initDatabaseSchema();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Database initialization failed' },
      { status: 500 }
    );
  }
}

