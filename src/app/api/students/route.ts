import { NextResponse } from 'next/server';
import { getAllStudentsWithDetails, enrollNewStudent } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || undefined;

    const currentUser = await getCurrentUser();

    // If caller is student, strictly return only their own record (Requirement 11)
    if (currentUser?.role === 'student') {
      const allStudents = await getAllStudentsWithDetails(courseId);
      const studentId = currentUser.studentId || currentUser.id;
      const ownRecord = allStudents.filter(
        (s) => s.id === studentId ||
               s.roll_number.toLowerCase() === studentId.toLowerCase() ||
               s.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      return NextResponse.json({ students: ownRecord });
    }

    const students = await getAllStudentsWithDetails(courseId);
    return NextResponse.json({ students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();

    // Only Admin can enroll new students
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can enroll new students' }, { status: 403 });
    }

    const body = await req.json();
    const { name, roll_number, email, department_id, password } = body;

    if (!name || !roll_number || !email || !department_id || !password) {
      return NextResponse.json(
        { error: 'Name, Roll Number, Email, Department, and Temporary Password are required.' },
        { status: 400 }
      );
    }

    const result = await enrollNewStudent(body);
    return NextResponse.json(
      {
        success: true,
        message: `Student ${result.student.name} (${result.student.roll_number}) enrolled successfully.`,
        student: result.student,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
