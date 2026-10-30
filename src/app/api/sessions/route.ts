import { NextResponse } from 'next/server';
import { getSessionsByCourse, createSession } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId') || undefined;
  const sessions = await getSessionsByCourse(courseId);
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await createSession(body);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

