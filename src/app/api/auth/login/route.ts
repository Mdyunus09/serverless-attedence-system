import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/authService';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const result = await authenticate(email, password);

    if (!result.success || !result.session) {
      return NextResponse.json(
        { success: false, message: result.message || 'Authentication failed.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.session.user,
    });

    // Set secure httpOnly cookie with HMAC signature
    await setSessionCookie(response, result.session);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
