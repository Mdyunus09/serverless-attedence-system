import { verifyUserPassword, getStudentById } from '@/lib/db';
import { AuthUser, SessionData, UserRole, DEMO_USERS } from './types';

export { DEMO_USERS };

/**
 * Authenticate email + password against Neon PostgreSQL (and in-memory fallback)
 */
export async function authenticate(
  email: string,
  password: string
): Promise<{ success: boolean; session?: SessionData; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await verifyUserPassword(normalizedEmail, password);

  if (!result.success || !result.user) {
    return { success: false, message: result.message || 'Invalid email or password.' };
  }

  const dbUser = result.user;

  // If student, resolve their roll number / student details
  let studentRollNumber: string | undefined = undefined;
  if (dbUser.role === 'student') {
    const student = await getStudentById(dbUser.student_id || dbUser.email);
    studentRollNumber = student?.roll_number || 'CS2023-001';
  }

  const authUser: AuthUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    studentId: studentRollNumber || dbUser.student_id,
    departmentId: dbUser.department_id,
  };

  const session: SessionData = {
    user: authUser,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  return { success: true, session };
}
