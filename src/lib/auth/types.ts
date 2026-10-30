import { UserRole, User } from '@/lib/types';

export type { UserRole, User };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studentId?: string; // Roll number or student DB id (e.g., 'stu-1', 'CS2023-001')
  departmentId?: string;
  departmentName?: string;
}

export interface SessionData {
  user: AuthUser;
  expiresAt: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
}

export const DEMO_USERS: Record<string, AuthUser & { passwordHint: string }> = {
  'admin@cadence.edu': {
    id: 'user-admin-1',
    email: 'admin@cadence.edu',
    name: 'Dr. Evelyn Vance',
    role: 'admin',
    departmentId: 'dept-1',
    departmentName: 'School of Computer Science & Engineering',
    passwordHint: 'admin123',
  },
  'faculty@cadence.edu': {
    id: 'user-fac-1',
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
    departmentName: 'Computer Science (Year 4)',
    passwordHint: 'student123',
  },
};
