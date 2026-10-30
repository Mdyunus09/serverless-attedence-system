export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type UserRole = 'admin' | 'faculty' | 'student';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  student_id?: string;
  department_id?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  faculty_head: string;
}

export interface AcademicClass {
  id: string;
  name: string; // e.g. "CS-Year3-SecA"
  department_id: string;
  semester: string; // e.g. "Semester 5"
  academic_year: string; // e.g. "2024-2025"
  department?: Department;
  student_count?: number;
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
  department?: Department;
}

export interface Faculty {
  id: string;
  user_id?: string;
  employee_id: string;
  name: string;
  email: string;
  department_id: string;
  designation: string;
  phone?: string;
  is_active: boolean;
  department?: Department;
  assigned_course_ids?: string[];
  assigned_class_ids?: string[];
  assigned_courses?: Course[];
  assigned_classes?: AcademicClass[];
  created_at?: string;
}

export interface SubjectAssignment {
  id: string;
  course_id: string;
  faculty_id: string;
  class_id: string;
  course?: Course;
  faculty?: Faculty;
  class?: AcademicClass;
  created_at?: string;
}

export interface Student {
  id: string;
  roll_number: string;
  name: string;
  email: string;
  avatar_url?: string;
  department_id: string;
  department?: Department;
  class_id?: string;
  class?: AcademicClass;
  batch_year: string;
  phone?: string;
  is_active?: boolean;
  user_account?: {
    id: string;
    is_active: boolean;
  };
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
  lecture_number?: number;
  topic?: string;
  class_id?: string;
  faculty_id?: string;
  duration_minutes?: number;
  status?: 'active' | 'closed' | 'cancelled';
  total_present?: number;
  total_absent?: number;
  total_late?: number;
  total_excused?: number;
  total_pending?: number;
  course?: Course;
  class?: AcademicClass;
  faculty?: Faculty;
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

export interface EnrollStudentInput {
  name: string;
  roll_number: string;
  email: string;
  department_id: string;
  class_id?: string;
  password: string;
  batch_year?: string;
  phone?: string;
}

export interface UpdateStudentInput {
  name?: string;
  roll_number?: string;
  email?: string;
  department_id?: string;
  class_id?: string;
  batch_year?: string;
  phone?: string;
  password?: string;
  is_active?: boolean;
}

export interface CreateFacultyInput {
  name: string;
  employee_id: string;
  email: string;
  department_id: string;
  designation?: string;
  phone?: string;
  password: string;
  assigned_course_ids?: string[];
  assigned_class_ids?: string[];
}

export interface UpdateFacultyInput {
  name?: string;
  employee_id?: string;
  email?: string;
  department_id?: string;
  designation?: string;
  phone?: string;
  password?: string;
  is_active?: boolean;
  assigned_course_ids?: string[];
  assigned_class_ids?: string[];
}

export interface CreateClassInput {
  name: string;
  department_id: string;
  semester: string;
  academic_year: string;
}

export interface CreateLectureInput {
  course_id: string;
  class_id?: string;
  topic: string;
  lecture_number: number;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type?: 'lecture' | 'lab' | 'seminar' | 'quiz';
}
