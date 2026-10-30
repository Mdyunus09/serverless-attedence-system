import { NextResponse } from 'next/server';
import { getLectureRoster, correctLectureAttendance } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const rosterData = await getLectureRoster(params.id);
    return NextResponse.json(rosterData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role === 'student') {
      return NextResponse.json({ error: 'Forbidden: Students cannot modify attendance records.' }, { status: 403 });
    }

    const body = await req.json();
    const { student_id, status, reason } = body;

    if (!student_id || !status) {
      return NextResponse.json({ error: 'student_id and status are required.' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Mandatory correction reason is required for manual attendance override.' },
        { status: 400 }
      );
    }

    const facultyName = currentUser?.name || 'Faculty Instructor';
    const updatedRecord = await correctLectureAttendance(
      params.id,
      student_id,
      status,
      reason.trim(),
      facultyName
    );

    return NextResponse.json({
      message: `Student attendance successfully corrected to ${status.toUpperCase()}.`,
      record: updatedRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update attendance.' }, { status: 400 });
  }
}

