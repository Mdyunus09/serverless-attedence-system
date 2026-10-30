import { NextResponse } from 'next/server';
import { getLeaveRequests, submitLeaveRequest } from '@/lib/db';

export async function GET() {
  const requests = await getLeaveRequests();
  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leave = await submitLeaveRequest(body);
    return NextResponse.json({ leave }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

