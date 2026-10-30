import { NextResponse } from 'next/server';
import { getFacultyById, updateFaculty, toggleFacultyStatus } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const faculty = await getFacultyById(params.id);
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found.' }, { status: 404 });
    }
    return NextResponse.json({ faculty });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can update faculty.' }, { status: 403 });
    }

    const body = await req.json();

    // Check if this is a status toggle
    if (body.is_active !== undefined && Object.keys(body).length === 1) {
      const result = await toggleFacultyStatus(params.id, Boolean(body.is_active));
      return NextResponse.json({
        message: `Faculty account ${body.is_active ? 'activated' : 'deactivated'} successfully.`,
        faculty: result.faculty,
      });
    }

    const result = await updateFaculty(params.id, body);
    return NextResponse.json({
      message: 'Faculty details updated successfully.',
      faculty: result.faculty,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update faculty.' }, { status: 400 });
  }
}

