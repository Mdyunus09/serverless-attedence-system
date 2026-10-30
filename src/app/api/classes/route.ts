import { NextResponse } from 'next/server';
import { getAllClasses, createClass } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const classes = await getAllClasses();
    return NextResponse.json({ classes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can create classes.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, department_id, semester, academic_year } = body;

    if (!name || !department_id || !semester || !academic_year) {
      return NextResponse.json(
        { error: 'Name, Department, Semester, and Academic Year are required.' },
        { status: 400 }
      );
    }

    const newClass = await createClass(body);
    return NextResponse.json({ message: 'Class created successfully.', class: newClass }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create class.' }, { status: 400 });
  }
}

