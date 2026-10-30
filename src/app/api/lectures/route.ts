import { NextResponse } from 'next/server';
import { getFacultyLectures, createLecture } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const facultyId = searchParams.get('facultyId') || undefined;
    const courseId = searchParams.get('courseId') || undefined;

    const lectures = await getFacultyLectures(facultyId, courseId);
    return NextResponse.json({ lectures });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role === 'student') {
      return NextResponse.json({ error: 'Forbidden: Students cannot create lectures.' }, { status: 403 });
    }

    const body = await req.json();
    const { course_id, topic, lecture_number, session_date, start_time, duration_minutes } = body;

    if (!course_id || !topic || !lecture_number || !session_date || !start_time || !duration_minutes) {
      return NextResponse.json(
        { error: 'Course, topic, lecture number, date, start time, and duration are required.' },
        { status: 400 }
      );
    }

    let facultyId = 'fac-1';
    if (currentUser?.role === 'faculty') {
      const rawId = currentUser.id || '';
      facultyId = rawId.startsWith('user-fac-') ? rawId.replace('user-', '') : rawId || 'fac-1';
    } else if (body.faculty_id) {
      facultyId = body.faculty_id.startsWith('user-fac-') ? body.faculty_id.replace('user-', '') : body.faculty_id;
    }
    const lecture = await createLecture(body, facultyId);

    return NextResponse.json(
      { message: 'Lecture started successfully.', lecture },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to start lecture.' }, { status: 400 });
  }
}

