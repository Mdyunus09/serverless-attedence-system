import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { AuthUser, SessionData, UserRole } from './types';

// Environment variables
const REGION = process.env.NEXT_PUBLIC_COGNITO_REGION || process.env.COGNITO_REGION || 'ap-southeast-1';
const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || process.env.COGNITO_USER_POOL_ID || '';
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || process.env.COGNITO_CLIENT_ID || '';

export function isCognitoConfigured(): boolean {
  return Boolean(
    USER_POOL_ID &&
    CLIENT_ID &&
    !USER_POOL_ID.includes('YOUR_') &&
    !CLIENT_ID.includes('YOUR_')
  );
}

// Demo accounts for instant local testing and seamless Vercel evaluation
export const DEMO_USERS: Record<string, AuthUser & { passwordHint: string }> = {
  'admin@cadence.edu': {
    id: 'u-admin-01',
    email: 'admin@cadence.edu',
    name: 'Dr. Evelyn Vance',
    role: 'admin',
    departmentId: 'dept-1',
    departmentName: 'School of Computer Science & Engineering',
    passwordHint: 'admin123',
  },
  'faculty@cadence.edu': {
    id: 'u-fac-01',
    email: 'faculty@cadence.edu',
    name: 'Dr. Aris Vandenberg',
    role: 'faculty',
    departmentId: 'dept-1',
    departmentName: 'Distributed Systems & Algorithms',
    passwordHint: 'faculty123',
  },
  'student@cadence.edu': {
    id: 'stu-1',
    email: 'student@cadence.edu',
    name: 'Arjun Mehta',
    role: 'student',
    studentId: 'CS2023-001',
    departmentId: 'dept-1',
    departmentName: 'Computer Science & Engineering',
    passwordHint: 'student123',
  },
  'arjun.m@student.univ.edu': {
    id: 'stu-1',
    email: 'arjun.m@student.univ.edu',
    name: 'Arjun Mehta',
    role: 'student',
    studentId: 'CS2023-001',
    departmentId: 'dept-1',
    departmentName: 'Computer Science & Engineering',
    passwordHint: 'student123',
  },
};

// Cognito Identity Provider Client (serverless friendly)
let cognitoClient: CognitoIdentityProviderClient | null = null;
function getCognitoClient(): CognitoIdentityProviderClient {
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
  }
  return cognitoClient;
}

// Cognito JWT Verifier
let jwtVerifier: any = null;
function getJwtVerifier() {
  if (!jwtVerifier && isCognitoConfigured()) {
    jwtVerifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: 'id',
      clientId: CLIENT_ID,
    });
  }
  return jwtVerifier;
}

/**
 * Authenticate with AWS Cognito, with seamless fallback to Demo Users
 */
export async function authenticate(
  email: string,
  password: string
): Promise<{ success: boolean; session?: SessionData; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check if Cognito is configured
  if (isCognitoConfigured()) {
    try {
      const client = getCognitoClient();
      const command = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: normalizedEmail,
          PASSWORD: password,
        },
      });

      const response = await client.send(command);
      const authResult = response.AuthenticationResult;

      if (!authResult || !authResult.IdToken) {
        return { success: false, message: 'Authentication failed: No tokens received from Cognito.' };
      }

      // Verify the ID token
      const verifier = getJwtVerifier();
      const payload = await verifier.verify(authResult.IdToken);

      // Determine role from cognito:groups or custom:role
      let role: UserRole = 'student';
      const groups = (payload['cognito:groups'] as string[]) || [];
      const customRole = (payload['custom:role'] as string)?.toLowerCase();

      if (groups.includes('Admins') || customRole === 'admin') {
        role = 'admin';
      } else if (groups.includes('Faculty') || customRole === 'faculty') {
        role = 'faculty';
      } else if (groups.includes('Students') || customRole === 'student') {
        role = 'student';
      }

      const user: AuthUser = {
        id: (payload.sub as string) || (payload['custom:student_id'] as string) || normalizedEmail,
        email: normalizedEmail,
        name: (payload.name as string) || (payload['cognito:username'] as string) || normalizedEmail,
        role,
        studentId: (payload['custom:student_id'] as string) || (payload['custom:roll_number'] as string),
        departmentId: payload['custom:department_id'] as string,
      };

      const session: SessionData = {
        user,
        idToken: authResult.IdToken,
        accessToken: authResult.AccessToken,
        refreshToken: authResult.RefreshToken,
        expiresAt: Date.now() + (authResult.ExpiresIn || 3600) * 1000,
        isDemo: false,
      };

      return { success: true, session };
    } catch (err: any) {
      console.error('Cognito Authentication Error:', err);
      // If error, check if it was a demo user attempting to login during dev/testing
      if (DEMO_USERS[normalizedEmail] && password === DEMO_USERS[normalizedEmail].passwordHint) {
        return createDemoSession(normalizedEmail);
      }
      return { success: false, message: err.message || 'Invalid credentials or Cognito error.' };
    }
  }

  // 2. Demo User Fallback (No AWS Cognito credentials configured yet)
  if (DEMO_USERS[normalizedEmail]) {
    const demo = DEMO_USERS[normalizedEmail];
    if (password === demo.passwordHint) {
      return createDemoSession(normalizedEmail);
    } else {
      return { success: false, message: `Invalid password. (Hint for demo: ${demo.passwordHint})` };
    }
  }

  return {
    success: false,
    message: 'User not found. Use one of the predefined demo accounts or configure AWS Cognito User Pool in .env.local.',
  };
}

function createDemoSession(email: string): { success: boolean; session: SessionData } {
  const demo = DEMO_USERS[email];
  const user: AuthUser = {
    id: demo.id,
    email: demo.email,
    name: demo.name,
    role: demo.role,
    studentId: demo.studentId,
    departmentId: demo.departmentId,
    departmentName: demo.departmentName,
  };

  const session: SessionData = {
    user,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    isDemo: true,
  };

  return { success: true, session };
}
