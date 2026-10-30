import { NextResponse } from 'next/server';
import { getAttendanceForSession, updateStudentAttendance, bulkUpdateAttendance } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const records = await getAttendanceForSession(params.id);
  return NextResponse.json({ records });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    if (body.bulk && Array.isArray(body.updates)) {
      await bulkUpdateAttendance(params.id, body.updates);
      return NextResponse.json({ success: true, count: body.updates.length });
    }

    const { studentId, status, remarks } = body;
    if (!studentId || !status) {
      return NextResponse.json({ error: 'Missing studentId or status' }, { status: 400 });
    }

    const record = await updateStudentAttendance(params.id, studentId, status, remarks);
    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

