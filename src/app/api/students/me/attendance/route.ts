import { NextResponse } from 'next/server';
import { getStudentPersonalAttendance } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    // Determine target student ID (for students, strictly their own ID; for Admin/Faculty testing, can fallback to first student)
    const targetIdentifier = currentUser.studentId || currentUser.email;
    const attendanceData = await getStudentPersonalAttendance(targetIdentifier);

    if (!attendanceData) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    return NextResponse.json(attendanceData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

