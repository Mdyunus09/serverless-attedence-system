import { NextResponse } from 'next/server';
import { verifyStudentLectureScan } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Authentication required. Please log in first.' }, { status: 401 });
    }

    if (currentUser.role !== 'student') {
      return NextResponse.json({ success: false, message: 'Only students can scan lecture attendance QR codes.' }, { status: 403 });
    }

    const body = await req.json();
    const { qrToken } = body;

    if (!qrToken || !qrToken.trim()) {
      return NextResponse.json({ success: false, message: 'QR Token is required.' }, { status: 400 });
    }

    const result = await verifyStudentLectureScan(qrToken.trim(), {
      id: currentUser.id,
      student_id: currentUser.studentId,
      email: currentUser.email,
      name: currentUser.name,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Verification error' }, { status: 500 });
  }
}

