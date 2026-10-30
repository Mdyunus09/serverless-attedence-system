import { NextResponse } from 'next/server';
import { getCourses, createCourse } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const courses = await getCourses();
    return NextResponse.json({ courses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can create subjects.' }, { status: 403 });
    }

    const body = await req.json();
    const { code, title, department_id, instructor_name, instructor_email } = body;

    if (!code || !title || !department_id || !instructor_name || !instructor_email) {
      return NextResponse.json(
        { error: 'Subject Code, Title, Department, Instructor Name, and Instructor Email are required.' },
        { status: 400 }
      );
    }

    const courseData = {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      department_id,
      instructor_name: instructor_name.trim(),
      instructor_email: instructor_email.trim().toLowerCase(),
      room: body.room?.trim() || 'Hall A',
      schedule_days: Array.isArray(body.schedule_days) && body.schedule_days.length > 0 ? body.schedule_days : ['Mon', 'Wed'],
      schedule_time: body.schedule_time?.trim() || '10:00 - 11:30 AM',
      semester: body.semester?.trim() || 'Fall 2026',
      target_attendance_pct: Number(body.target_attendance_pct) || 75,
      total_sessions: Number(body.total_sessions) || 0,
      enrolled_count: 14,
    };

    const course = await createCourse(courseData);
    return NextResponse.json({ message: 'Subject created successfully.', course }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create subject.' }, { status: 400 });
  }
}
