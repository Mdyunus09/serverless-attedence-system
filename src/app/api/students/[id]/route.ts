import { NextResponse } from 'next/server';
import { updateStudent, toggleStudentStatus, getStudentById } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const student = await getStudentById(params.id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ student });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const result = await updateStudent(params.id, body);

    return NextResponse.json({
      success: true,
      message: `Student ${result.student.name} updated successfully.`,
      student: result.student,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const result = await toggleStudentStatus(params.id, false);
    return NextResponse.json({
      success: true,
      message: `Student account for ${result.student.name} deactivated.`,
      student: result.student,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

