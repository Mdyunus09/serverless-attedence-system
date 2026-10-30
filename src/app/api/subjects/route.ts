import { NextResponse } from 'next/server';
import { getCourses, getAllSubjectAssignments, assignFacultyToSubject, removeSubjectAssignment } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const [courses, assignments] = await Promise.all([
      getCourses(),
      getAllSubjectAssignments(),
    ]);
    return NextResponse.json({ courses, assignments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can assign subjects.' }, { status: 403 });
    }

    const body = await req.json();
    const { course_id, faculty_id, class_id } = body;

    if (!course_id || !faculty_id || !class_id) {
      return NextResponse.json(
        { error: 'Course, Faculty, and Class are all required for subject assignment.' },
        { status: 400 }
      );
    }

    const assignment = await assignFacultyToSubject(course_id, faculty_id, class_id);
    return NextResponse.json({ message: 'Subject assigned successfully.', assignment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to assign subject.' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can remove subject assignments.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Assignment ID required.' }, { status: 400 });
    }

    await removeSubjectAssignment(id);
    return NextResponse.json({ message: 'Subject assignment removed successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

