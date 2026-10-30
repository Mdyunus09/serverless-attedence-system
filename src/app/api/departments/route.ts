import { NextResponse } from 'next/server';
import { getDepartments, createDepartment } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const departments = await getDepartments();
    return NextResponse.json({ departments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can create departments.' }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, faculty_head } = body;

    if (!code || !name || !faculty_head) {
      return NextResponse.json(
        { error: 'Code, Department Name, and Faculty Head are required.' },
        { status: 400 }
      );
    }

    const department = await createDepartment({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      faculty_head: faculty_head.trim(),
    });

    return NextResponse.json({ message: 'Department created successfully.', department }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create department.' }, { status: 400 });
  }
}

