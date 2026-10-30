import { NextResponse } from 'next/server';
import { verifyQRCodeCheckIn } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { qrToken, studentIdOrEmail } = await req.json();
    if (!qrToken || !studentIdOrEmail) {
      return NextResponse.json({ success: false, message: 'Token and Student ID are required' }, { status: 400 });
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

