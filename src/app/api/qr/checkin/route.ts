import { NextResponse } from 'next/server';
import { verifyQRCodeCheckIn } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const { qrToken, studentIdOrEmail } = await req.json();
    if (!qrToken || !studentIdOrEmail) {
      return NextResponse.json({ success: false, message: 'Token and Student ID are required' }, { status: 400 });
    }

    // Role-based verification: If authenticated as student, prevent proxy checking in for someone else
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role === 'student') {
      const requestedId = studentIdOrEmail.trim().toLowerCase();
      const ownEmail = currentUser.email.toLowerCase();
      const ownStudentId = (currentUser.studentId || '').toLowerCase();

      // Check if requestedId matches student's own email or studentId/roll number
      if (requestedId !== ownEmail && requestedId !== ownStudentId && !ownEmail.includes(requestedId)) {
        return NextResponse.json(
          {
            success: false,
            message: `Anti-Proxy Security: You are authenticated as ${currentUser.name} (${currentUser.studentId || currentUser.email}). You cannot check in on behalf of another student.`,
          },
          { status: 403 }
        );
      }
    }

    const res = await verifyQRCodeCheckIn(qrToken, studentIdOrEmail);
    if (!res.success) {
      return NextResponse.json(res, { status: 400 });
    }
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
