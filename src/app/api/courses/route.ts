import { NextResponse } from 'next/server';
import { getCourses, createCourse } from '@/lib/db';

export async function GET() {
  const courses = await getCourses();
  return NextResponse.json({ courses });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const course = await createCourse(body);
    return NextResponse.json({ course }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

