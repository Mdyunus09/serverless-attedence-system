import { NextResponse } from 'next/server';
import { reviewLeaveRequest } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, reviewedBy, reviewNote } = body;
    const updated = await reviewLeaveRequest(params.id, status, reviewedBy || 'Instructor', reviewNote);
    return NextResponse.json({ success: true, leave: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

