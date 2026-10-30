import { NextResponse } from 'next/server';
import { closeLecture } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role === 'student') {
      return NextResponse.json({ error: 'Forbidden: Students cannot conclude lectures.' }, { status: 403 });
    }

    const actorName = currentUser?.name || 'Faculty';
    const result = await closeLecture(params.id, actorName);

    return NextResponse.json({
      message: `Lecture closed successfully. ${result.absentCount} pending students automatically marked Absent.`,
      session: result.session,
      absentCount: result.absentCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to close lecture.' }, { status: 400 });
  }
}

