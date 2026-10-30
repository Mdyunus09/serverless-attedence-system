import { NextResponse } from 'next/server';
import { getSessionById } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const lecture = await getSessionById(params.id);
    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found.' }, { status: 404 });
    }
    return NextResponse.json({ lecture });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

