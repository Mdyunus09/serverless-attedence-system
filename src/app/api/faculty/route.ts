import { NextResponse } from 'next/server';
import { getAllFaculty, createFaculty } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const faculty = await getAllFaculty();
    return NextResponse.json({ faculty });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can create faculty accounts.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, employee_id, email, department_id, password } = body;

    if (!name || !employee_id || !email || !department_id || !password) {
      return NextResponse.json(
        { error: 'Name, Employee ID, Email, Department, and Password are required.' },
        { status: 400 }
      );
    }

    const result = await createFaculty(body);
    return NextResponse.json(
      {
        message: 'Faculty account created successfully.',
        faculty: result.faculty,
        user: { id: result.user.id, email: result.user.email, role: result.user.role },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create faculty.' }, { status: 400 });
  }
}

