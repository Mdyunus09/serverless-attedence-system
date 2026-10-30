export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Department {
  id: string;
  code: string;
  name: string;
  faculty_head: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  department_id: string;
  instructor_name: string;
  instructor_email: string;
  room: string;
  schedule_days: string[]; // e.g. ["Mon", "Wed", "Fri"]
  schedule_time: string; // e.g. "10:00 - 11:30 AM"
  semester: string;
  target_attendance_pct: number;
  total_sessions?: number;
  enrolled_count?: number;
}

export interface Student {
  id: string;
  roll_number: string;
  name: string;
  email: string;
  avatar_url?: string;
  department_id: string;
  batch_year: string;
  phone?: string;
  // Computed stats when loaded in course context
  stats?: {
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
    status: 'good' | 'warning' | 'critical';
    classesNeededFor75: number;
  };
}

export interface Session {
  id: string;
  course_id: string;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  title: string;
  session_type: 'lecture' | 'lab' | 'seminar' | 'quiz';
  qr_token?: string;
  qr_expires_at?: string;
  is_closed: boolean;
  total_present?: number;
  total_absent?: number;
  total_late?: number;
  total_excused?: number;
  course?: Course;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  check_in_time?: string;
  remarks?: string;
  updated_by?: string;
  updated_at?: string;
  student?: Student;
}

export interface LeaveRequest {
  id: string;
  student_id: string;
  course_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  proof_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_note?: string;
  created_at: string;
  student?: Student;
  course?: Course;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}

export interface DatabaseStatus {
  connected: boolean;
  provider: 'neon-postgresql' | 'memory-fallback';
  host?: string;
  database?: string;
  user?: string;
  latencyMs?: number;
  tablesCount?: number;
  message?: string;
}

