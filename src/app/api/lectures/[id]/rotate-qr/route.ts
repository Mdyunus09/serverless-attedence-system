import { NextResponse } from 'next/server';
import { refreshSessionQR } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role === 'student') {
      return NextResponse.json({ error: 'Forbidden: Students cannot rotate lecture QR codes.' }, { status: 403 });
    }

    const result = await refreshSessionQR(params.id);
    return NextResponse.json({
      success: true,
      qr_token: result.qr_token,
      qr_expires_at: result.qr_expires_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to rotate QR code.' }, { status: 400 });
  }
}

