export type UserRole = 'admin' | 'faculty' | 'student';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studentId?: string; // Roll number or student DB id (e.g., 's1', 'CS21-042')
  departmentId?: string;
  departmentName?: string;
}

export interface SessionData {
  user: AuthUser;
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt: number;
  isDemo?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
}

