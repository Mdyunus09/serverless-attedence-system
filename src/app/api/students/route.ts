import { NextResponse } from 'next/server';
import { getStudentsWithStats, createStudent } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId') || undefined;
  const students = await getStudentsWithStats(courseId);
  return NextResponse.json({ students });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const student = await createStudent(body);
    return NextResponse.json({ student }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

