import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isCognitoConfigured } from '@/lib/auth/cognito';

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    authenticated: Boolean(user),
    user,
    cognitoConfigured: isCognitoConfigured(),
  });
}

