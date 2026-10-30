import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import {
  Department,
  Course,
  Student,
  Session,
  AttendanceRecord,
  LeaveRequest,
  AuditLog,
  DatabaseStatus,
  AttendanceStatus,
  User,
  AcademicClass,
  Faculty,
  SubjectAssignment,
  EnrollStudentInput,
  UpdateStudentInput,
  CreateFacultyInput,
  UpdateFacultyInput,
  CreateClassInput,
  CreateLectureInput,
} from './types';
import {
  initialDepartments,
  initialCourses,
  initialStudents,
  initialSessions,
  initialAttendanceRecords,
  initialLeaveRequests,
  initialAuditLogs,
  initialUsers,
  initialClasses,
  initialFaculty,
  initialSubjectAssignments,
} from './mockData';

// Global in-memory fallback store
interface MemoryStore {
  departments: Department[];
  courses: Course[];
  students: Student[];
  sessions: Session[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  auditLogs: AuditLog[];
  users: User[];
  classes: AcademicClass[];
  faculty: Faculty[];
  subjectAssignments: SubjectAssignment[];
}

const globalForStore = globalThis as unknown as {
  memoryStore?: MemoryStore;
  pgPool?: Pool | null;
};

if (!globalForStore.memoryStore) {
  globalForStore.memoryStore = {
    departments: [...initialDepartments],
    courses: [...initialCourses],
    students: [...initialStudents],
    sessions: [...initialSessions],
    attendanceRecords: [...initialAttendanceRecords],
    leaveRequests: [...initialLeaveRequests],
    auditLogs: [...initialAuditLogs],
    users: [...initialUsers],
    classes: [...initialClasses],
    faculty: [...initialFaculty],
    subjectAssignments: [...initialSubjectAssignments],
  };
} else {
  if (!globalForStore.memoryStore.users) globalForStore.memoryStore.users = [...initialUsers];
  if (!globalForStore.memoryStore.classes) globalForStore.memoryStore.classes = [...initialClasses];
  if (!globalForStore.memoryStore.faculty) globalForStore.memoryStore.faculty = [...initialFaculty];
  if (!globalForStore.memoryStore.subjectAssignments) globalForStore.memoryStore.subjectAssignments = [...initialSubjectAssignments];
}

const memoryStore = globalForStore.memoryStore;

function isRealDatabaseUrl(url?: string): boolean {
  if (!url) return false;
  if (url.includes('[YOUR_PASSWORD]') || url.includes('****')) return false;
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

export function getPgPool(): Pool | null {
  const connStr = process.env.DATABASE_URL;
  if (!isRealDatabaseUrl(connStr)) {
    return null;
  }
  if (!globalForStore.pgPool) {
    globalForStore.pgPool = new Pool({
      connectionString: connStr,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });
  }
  return globalForStore.pgPool;
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const connStr = process.env.DATABASE_URL;
  const isConfigured = isRealDatabaseUrl(connStr);

  if (!isConfigured) {
    return {
      connected: false,
      provider: 'memory-fallback',
      host: 'ep-bold-silence-b3bw8hxt-pooler.c-4.ap-southeast-1.aws.neon.tech',
      database: 'neondb',
      user: 'neondb_owner',
      message: 'Neon connection URL has placeholder password. Using high-fidelity operational storage.',
    };
  }

  const pool = getPgPool();
  if (!pool) {
    return {
      connected: false,
      provider: 'memory-fallback',
      message: 'Failed to initialize connection pool',
    };
  }

  const start = Date.now();
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db, current_user as usr;');
    const latencyMs = Date.now() - start;

    // Check table count
    const tableRes = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);

    return {
      connected: true,
      provider: 'neon-postgresql',
      host: 'ep-bold-silence-b3bw8hxt-pooler.c-4.ap-southeast-1.aws.neon.tech',
      database: res.rows[0]?.db || 'neondb',
      user: res.rows[0]?.usr || 'neondb_owner',
      latencyMs,
      tablesCount: parseInt(tableRes.rows[0]?.count || '0', 10),
      message: 'Active cloud connection to Neon PostgreSQL verified.',
    };
  } catch (err: any) {
    return {
      connected: false,
      provider: 'memory-fallback',
      message: `Neon connection error: ${err.message || 'Check password/network'}`,
    };
  }
}

export async function initDatabaseSchema(): Promise<{ success: boolean; message: string; tables: string[] }> {
  const pool = getPgPool();
  if (!pool) {
    return {
      success: false,
      message: 'Neon PostgreSQL credentials not provided in .env.local yet. Please provide your Neon password.',
      tables: [],
    };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(32) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        faculty_head VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(32) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        department_id VARCHAR(64) REFERENCES departments(id) ON DELETE CASCADE,
        instructor_name VARCHAR(255) NOT NULL,
        instructor_email VARCHAR(255) NOT NULL,
        room VARCHAR(128) NOT NULL,
        schedule_days TEXT[] NOT NULL,
        schedule_time VARCHAR(128) NOT NULL,
        semester VARCHAR(64) NOT NULL,
        target_attendance_pct INT NOT NULL DEFAULT 75,
        total_sessions INT NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(64) PRIMARY KEY,
        roll_number VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        avatar_url TEXT,
        department_id VARCHAR(64) REFERENCES departments(id) ON DELETE CASCADE,
        batch_year VARCHAR(32) NOT NULL,
        phone VARCHAR(64),
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(64) PRIMARY KEY,
        course_id VARCHAR(64) REFERENCES courses(id) ON DELETE CASCADE,
        session_date DATE NOT NULL,
        start_time VARCHAR(16) NOT NULL,
        end_time VARCHAR(16) NOT NULL,
        title VARCHAR(255) NOT NULL,
        session_type VARCHAR(32) NOT NULL DEFAULT 'lecture',
        qr_token VARCHAR(128),
        qr_expires_at TIMESTAMP WITH TIME ZONE,
        is_closed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) REFERENCES sessions(id) ON DELETE CASCADE,
        student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
        status VARCHAR(32) NOT NULL,
        check_in_time VARCHAR(32),
        remarks TEXT,
        updated_by VARCHAR(255),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_session_student UNIQUE (session_id, student_id)
      );

      CREATE TABLE IF NOT EXISTS leave_requests (
        id VARCHAR(64) PRIMARY KEY,
        student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
        course_id VARCHAR(64) REFERENCES courses(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        proof_url TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        reviewed_by VARCHAR(255),
        review_note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        actor VARCHAR(255) NOT NULL,
        action VARCHAR(128) NOT NULL,
        target_type VARCHAR(64) NOT NULL,
        target_id VARCHAR(64) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL,
        student_id VARCHAR(64) REFERENCES students(id) ON DELETE SET NULL,
        department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department_id VARCHAR(64) REFERENCES departments(id) ON DELETE CASCADE,
        semester VARCHAR(64) NOT NULL,
        academic_year VARCHAR(64) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS faculty (
        id VARCHAR(64) PRIMARY KEY,
        employee_id VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        department_id VARCHAR(64) REFERENCES departments(id) ON DELETE CASCADE,
        designation VARCHAR(128) NOT NULL,
        phone VARCHAR(64),
        assigned_course_ids TEXT[] NOT NULL DEFAULT '{}',
        assigned_class_ids TEXT[] NOT NULL DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subject_assignments (
        id VARCHAR(64) PRIMARY KEY,
        course_id VARCHAR(64) REFERENCES courses(id) ON DELETE CASCADE,
        faculty_id VARCHAR(64) REFERENCES faculty(id) ON DELETE CASCADE,
        class_id VARCHAR(64) REFERENCES classes(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_course_faculty_class UNIQUE (course_id, faculty_id, class_id)
      );

      ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id VARCHAR(64);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lecture_number INT;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS topic VARCHAR(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS class_id VARCHAR(64);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(64);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_minutes INT;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';
    `);

    // Check if initial departments exist, if not seed
    const deptCheck = await client.query('SELECT COUNT(*) FROM departments');
    if (parseInt(deptCheck.rows[0].count, 10) === 0) {
      for (const d of initialDepartments) {
        await client.query(
          'INSERT INTO departments (id, code, name, faculty_head) VALUES ($1, $2, $3, $4)',
          [d.id, d.code, d.name, d.faculty_head]
        );
      }
      for (const c of initialCourses) {
        await client.query(
          'INSERT INTO courses (id, code, title, department_id, instructor_name, instructor_email, room, schedule_days, schedule_time, semester, target_attendance_pct, total_sessions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [c.id, c.code, c.title, c.department_id, c.instructor_name, c.instructor_email, c.room, c.schedule_days, c.schedule_time, c.semester, c.target_attendance_pct, c.total_sessions || 0]
        );
      }
      for (const s of initialStudents) {
        await client.query(
          'INSERT INTO students (id, roll_number, name, email, department_id, batch_year, phone, class_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [s.id, s.roll_number, s.name, s.email, s.department_id, s.batch_year, s.phone, s.class_id || 'class-1']
        );
      }
      for (const sess of initialSessions) {
        await client.query(
          'INSERT INTO sessions (id, course_id, session_date, start_time, end_time, title, session_type, qr_token, is_closed, lecture_number, topic, class_id, faculty_id, duration_minutes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
          [sess.id, sess.course_id, sess.session_date, sess.start_time, sess.end_time, sess.title, sess.session_type, sess.qr_token || null, sess.is_closed, sess.lecture_number || 1, sess.topic || sess.title, sess.class_id || 'class-1', sess.faculty_id || 'fac-1', sess.duration_minutes || 60, sess.status || 'closed']
        );
      }
      for (const att of initialAttendanceRecords) {
        await client.query(
          'INSERT INTO attendance_records (id, session_id, student_id, status, check_in_time, remarks) VALUES ($1, $2, $3, $4, $5, $6)',
          [att.id, att.session_id, att.student_id, att.status, att.check_in_time || null, att.remarks || null]
        );
      }
      for (const lr of initialLeaveRequests) {
        await client.query(
          'INSERT INTO leave_requests (id, student_id, course_id, start_date, end_date, reason, proof_url, status, reviewed_by, review_note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [lr.id, lr.student_id, lr.course_id, lr.start_date, lr.end_date, lr.reason, lr.proof_url || null, lr.status, lr.reviewed_by || null, lr.review_note || null]
        );
      }
      for (const log of initialAuditLogs) {
        await client.query(
          'INSERT INTO audit_logs (id, actor, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
          [log.id, log.actor, log.action, log.target_type, log.target_id, log.details]
        );
      }
    }

    // Seed classes if empty
    const classCheck = await client.query('SELECT COUNT(*) FROM classes');
    if (parseInt(classCheck.rows[0].count, 10) === 0) {
      for (const cls of initialClasses) {
        await client.query(
          'INSERT INTO classes (id, name, department_id, semester, academic_year) VALUES ($1, $2, $3, $4, $5)',
          [cls.id, cls.name, cls.department_id, cls.semester, cls.academic_year]
        );
      }
    }

    // Seed faculty if empty
    const facCheck = await client.query('SELECT COUNT(*) FROM faculty');
    if (parseInt(facCheck.rows[0].count, 10) === 0) {
      for (const f of initialFaculty) {
        await client.query(
          'INSERT INTO faculty (id, employee_id, name, email, department_id, designation, phone, assigned_course_ids, assigned_class_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [f.id, f.employee_id, f.name, f.email, f.department_id, f.designation, f.phone || null, f.assigned_course_ids, f.assigned_class_ids]
        );
      }
    }

    // Seed subject assignments if empty
    const assignCheck = await client.query('SELECT COUNT(*) FROM subject_assignments');
    if (parseInt(assignCheck.rows[0].count, 10) === 0) {
      for (const a of initialSubjectAssignments) {
        await client.query(
          'INSERT INTO subject_assignments (id, course_id, faculty_id, class_id) VALUES ($1, $2, $3, $4)',
          [a.id, a.course_id, a.faculty_id, a.class_id]
        );
      }
    }

    // Check if initial users exist, if not seed
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count, 10) === 0) {
      for (const u of initialUsers) {
        await client.query(
          'INSERT INTO users (id, email, password_hash, name, role, student_id, department_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [u.id, u.email, u.password_hash, u.name, u.role, u.student_id || null, u.department_id || null]
        );
      }
    }

    await client.query('COMMIT');
    return {
      success: true,
      message: 'Neon PostgreSQL tables and seed data initialized successfully.',
      tables: ['departments', 'courses', 'students', 'sessions', 'attendance_records', 'leave_requests', 'audit_logs', 'users', 'classes', 'faculty', 'subject_assignments'],
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Queries for Courses
export async function getCourses(): Promise<Course[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(`
        SELECT c.*, 
          (SELECT COUNT(*) FROM students) as enrolled_count
        FROM courses c 
        ORDER BY c.code ASC;
      `);
      return res.rows.map((row: any) => ({
        ...row,
        enrolled_count: parseInt(row.enrolled_count || '14', 10),
      }));
    } catch (e) {
      console.warn('Neon query error, fallback to memory store:', e);
    }
  }
  return memoryStore.courses;
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
      if (res.rows[0]) return res.rows[0];
    } catch (e) {
      console.warn('Neon query error:', e);
    }
  }
  return memoryStore.courses.find((c) => c.id === courseId) || null;
}

export async function createCourse(data: Omit<Course, 'id'>): Promise<Course> {
  const newCourse: Course = {
    ...data,
    id: `course-${Date.now()}`,
    enrolled_count: 14,
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO courses (id, code, title, department_id, instructor_name, instructor_email, room, schedule_days, schedule_time, semester, target_attendance_pct, total_sessions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          newCourse.id,
          newCourse.code,
          newCourse.title,
          newCourse.department_id,
          newCourse.instructor_name,
          newCourse.instructor_email,
          newCourse.room,
          newCourse.schedule_days,
          newCourse.schedule_time,
          newCourse.semester,
          newCourse.target_attendance_pct,
          newCourse.total_sessions || 0,
        ]
      );
    } catch (e) {
      console.warn('Neon insert error:', e);
    }
  }

  memoryStore.courses.push(newCourse);
  addAuditLog('System', 'COURSE_CREATED', 'Course', newCourse.id, `Created course ${newCourse.code}: ${newCourse.title}`);
  return newCourse;
}

// Queries for Sessions
export async function getSessionsByCourse(courseId?: string): Promise<Session[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      let query = 'SELECT s.*, c.code as course_code, c.title as course_title FROM sessions s JOIN courses c ON s.course_id = c.id';
      const params: any[] = [];
      if (courseId) {
        query += ' WHERE s.course_id = $1';
        params.push(courseId);
      }
      query += ' ORDER BY s.session_date DESC, s.start_time DESC';
      const res = await pool.query(query, params);

      // Compute stats
      return res.rows.map((r: any) => ({
        ...r,
        session_date: typeof r.session_date === 'string' ? r.session_date.split('T')[0] : r.session_date.toISOString().split('T')[0],
      }));
    } catch (e) {
      console.warn('Neon session query error:', e);
    }
  }

  const list = courseId ? memoryStore.sessions.filter((s) => s.course_id === courseId) : memoryStore.sessions;
  return list.map((s) => {
    const records = memoryStore.attendanceRecords.filter((a) => a.session_id === s.id);
    return {
      ...s,
      total_present: records.filter((r) => r.status === 'present').length,
      total_absent: records.filter((r) => r.status === 'absent').length,
      total_late: records.filter((r) => r.status === 'late').length,
      total_excused: records.filter((r) => r.status === 'excused').length,
      course: memoryStore.courses.find((c) => c.id === s.course_id),
    };
  });
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const sessions = await getSessionsByCourse();
  return sessions.find((s) => s.id === sessionId) || null;
}

export async function createSession(data: {
  course_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  title: string;
  session_type: 'lecture' | 'lab' | 'seminar' | 'quiz';
}): Promise<Session> {
  const qrToken = `CADENCE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const newSession: Session = {
    id: `sess-${Date.now()}`,
    course_id: data.course_id,
    session_date: data.session_date,
    start_time: data.start_time,
    end_time: data.end_time,
    title: data.title,
    session_type: data.session_type,
    qr_token: qrToken,
    qr_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    is_closed: false,
    total_present: 0,
    total_absent: 0,
    total_late: 0,
    total_excused: 0,
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO sessions (id, course_id, session_date, start_time, end_time, title, session_type, qr_token, is_closed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newSession.id,
          newSession.course_id,
          newSession.session_date,
          newSession.start_time,
          newSession.end_time,
          newSession.title,
          newSession.session_type,
          newSession.qr_token,
          false,
        ]
      );
    } catch (e) {
      console.warn('Neon create session error:', e);
    }
  }

  memoryStore.sessions.unshift(newSession);

  // Initialize empty attendance records for all students
  const students = await getStudentsWithStats(data.course_id);
  for (const stu of students) {
    const record: AttendanceRecord = {
      id: `att-${newSession.id}-${stu.id}`,
      session_id: newSession.id,
      student_id: stu.id,
      status: 'absent', // default before roll-call
      updated_at: new Date().toISOString(),
    };
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO attendance_records (id, session_id, student_id, status)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [record.id, record.session_id, record.student_id, record.status]
        );
      } catch (err) {
        // ignore
      }
    }
    memoryStore.attendanceRecords.push(record);
  }

  addAuditLog('Instructor', 'SESSION_LAUNCHED', 'Session', newSession.id, `Started ${data.session_type}: ${data.title}`);
  return newSession;
}

export async function closeSession(sessionId: string): Promise<boolean> {
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query('UPDATE sessions SET is_closed = TRUE WHERE id = $1', [sessionId]);
    } catch (e) {
      console.warn('Neon close session error:', e);
    }
  }

  const s = memoryStore.sessions.find((x) => x.id === sessionId);
  if (s) {
    s.is_closed = true;
  }
  addAuditLog('Instructor', 'SESSION_FINALIZED', 'Session', sessionId, 'Locked session attendance roll');
  return true;
}

// Queries for Attendance Records
export async function getAttendanceForSession(sessionId: string): Promise<AttendanceRecord[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT a.*, s.name as student_name, s.roll_number as student_roll, s.email as student_email
         FROM attendance_records a
         JOIN students s ON a.student_id = s.id
         WHERE a.session_id = $1
         ORDER BY s.roll_number ASC`,
        [sessionId]
      );
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          ...r,
          student: {
            id: r.student_id,
            roll_number: r.student_roll,
            name: r.student_name,
            email: r.student_email,
            department_id: 'dept-1',
            batch_year: '2023-2027',
          },
        }));
      }
    } catch (e) {
      console.warn('Neon attendance records error:', e);
    }
  }

  const records = memoryStore.attendanceRecords.filter((a) => a.session_id === sessionId);
  return records.map((rec) => ({
    ...rec,
    student: memoryStore.students.find((s) => s.id === rec.student_id),
  }));
}

export async function updateStudentAttendance(
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
  remarks?: string
): Promise<AttendanceRecord> {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const pool = getPgPool();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO attendance_records (id, session_id, student_id, status, check_in_time, remarks, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (session_id, student_id)
         DO UPDATE SET status = EXCLUDED.status, check_in_time = EXCLUDED.check_in_time, remarks = EXCLUDED.remarks, updated_at = NOW()`,
        [`att-${sessionId}-${studentId}`, sessionId, studentId, status, timeStr, remarks || null]
      );
    } catch (e) {
      console.warn('Neon update attendance error:', e);
    }
  }

  let record = memoryStore.attendanceRecords.find((r) => r.session_id === sessionId && r.student_id === studentId);
  if (!record) {
    record = {
      id: `att-${sessionId}-${studentId}`,
      session_id: sessionId,
      student_id: studentId,
      status,
      check_in_time: timeStr,
      remarks,
      updated_at: new Date().toISOString(),
    };
    memoryStore.attendanceRecords.push(record);
  } else {
    record.status = status;
    record.check_in_time = timeStr;
    if (remarks !== undefined) record.remarks = remarks;
    record.updated_at = new Date().toISOString();
  }

  return record;
}

export async function bulkUpdateAttendance(
  sessionId: string,
  updates: Array<{ studentId: string; status: AttendanceStatus; remarks?: string }>
): Promise<boolean> {
  for (const u of updates) {
    await updateStudentAttendance(sessionId, u.studentId, u.status, u.remarks);
  }
  addAuditLog('Instructor', 'BATCH_ATTENDANCE_UPDATE', 'Session', sessionId, `Batch updated ${updates.length} students attendance`);
  return true;
}

export async function verifyQRCodeCheckIn(qrToken: string, studentRollOrEmail: string): Promise<{ success: boolean; message: string; studentName?: string; courseTitle?: string }> {
  // Find session with this active token
  const activeSession = memoryStore.sessions.find((s) => s.qr_token === qrToken && !s.is_closed);
  if (!activeSession) {
    return { success: false, message: 'Invalid or expired QR code session token.' };
  }

  const student = memoryStore.students.find(
    (s) => s.roll_number.toLowerCase() === studentRollOrEmail.toLowerCase().trim() ||
           s.email.toLowerCase() === studentRollOrEmail.toLowerCase().trim()
  );

  if (!student) {
    return { success: false, message: 'Student roll number / institutional email not recognized.' };
  }

  if (student.is_active === false) {
    return { success: false, message: 'Check-in failed: Student account has been deactivated by administration.' };
  }

  const course = memoryStore.courses.find((c) => c.id === activeSession.course_id);
  await updateStudentAttendance(activeSession.id, student.id, 'present', 'Verified via QR Self Check-In');

  addAuditLog(student.name, 'SELF_QR_CHECKIN', 'Session', activeSession.id, `Student checked in successfully via Dynamic QR token`);

  return {
    success: true,
    message: `Attendance recorded: Present for ${course?.code} (${activeSession.title})`,
    studentName: student.name,
    courseTitle: course?.title,
  };
}

// Queries for Students with Attendance Analytics
export async function getStudentsWithStats(courseId?: string): Promise<Student[]> {
  const students = [...memoryStore.students];
  const targetCourseId = courseId || 'course-1';
  const courseSessions = memoryStore.sessions.filter((s) => s.course_id === targetCourseId);
  const totalSessions = courseSessions.length || 1;

  return students.map((stu) => {
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let excusedCount = 0;

    courseSessions.forEach((sess) => {
      const rec = memoryStore.attendanceRecords.find((r) => r.session_id === sess.id && r.student_id === stu.id);
      if (!rec) {
        absentCount++;
      } else if (rec.status === 'present') {
        presentCount++;
      } else if (rec.status === 'late') {
        lateCount++;
      } else if (rec.status === 'excused') {
        excusedCount++;
      } else {
        absentCount++;
      }
    });

    // Attendance calculation: Present + 0.75 * Late + Excused
    // Note: Late gives 0.75 weight or full if configured
    const effectiveAttended = presentCount + lateCount * 0.75 + excusedCount;
    const percentage = Math.min(100, Math.round((effectiveAttended / totalSessions) * 100));

    let status: 'good' | 'warning' | 'critical' = 'good';
    if (percentage < 75) status = 'critical';
    else if (percentage < 85) status = 'warning';

    // How many consecutive classes needed to reach 75%
    // (effective + x) / (total + x) >= 0.75 => x >= (0.75*total - effective) / 0.25
    let classesNeededFor75 = 0;
    if (percentage < 75) {
      const needed = (0.75 * totalSessions - effectiveAttended) / 0.25;
      classesNeededFor75 = Math.max(1, Math.ceil(needed));
    }

    return {
      ...stu,
      stats: {
        totalSessions,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        percentage,
        status,
        classesNeededFor75,
      },
    };
  });
}

export async function createStudent(data: Omit<Student, 'id' | 'stats'>): Promise<Student> {
  const newStudent: Student = {
    ...data,
    id: `stu-${Date.now()}`,
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO students (id, roll_number, name, email, department_id, batch_year, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newStudent.id, newStudent.roll_number, newStudent.name, newStudent.email, newStudent.department_id, newStudent.batch_year, newStudent.phone || null]
      );
    } catch (e) {
      console.warn('Neon student insert error:', e);
    }
  }

  memoryStore.students.push(newStudent);
  addAuditLog('Admin', 'STUDENT_ENROLLED', 'Student', newStudent.id, `Enrolled student ${newStudent.name} (${newStudent.roll_number})`);
  return newStudent;
}

// Queries for Leave Requests
export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(`
        SELECT lr.*, s.name as student_name, s.roll_number, c.code as course_code
        FROM leave_requests lr
        JOIN students s ON lr.student_id = s.id
        JOIN courses c ON lr.course_id = c.id
        ORDER BY lr.created_at DESC;
      `);
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          ...r,
          student: { name: r.student_name, roll_number: r.roll_number },
          course: { code: r.course_code },
        }));
      }
    } catch (e) {
      console.warn('Neon leave query error:', e);
    }
  }

  return memoryStore.leaveRequests.map((lr) => ({
    ...lr,
    student: memoryStore.students.find((s) => s.id === lr.student_id),
    course: memoryStore.courses.find((c) => c.id === lr.course_id),
  }));
}

export async function reviewLeaveRequest(
  leaveId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  reviewNote?: string
): Promise<LeaveRequest | null> {
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `UPDATE leave_requests SET status = $1, reviewed_by = $2, review_note = $3 WHERE id = $4`,
        [status, reviewedBy, reviewNote || null, leaveId]
      );
    } catch (e) {
      console.warn('Neon update leave error:', e);
    }
  }

  const req = memoryStore.leaveRequests.find((r) => r.id === leaveId);
  if (req) {
    req.status = status;
    req.reviewed_by = reviewedBy;
    req.review_note = reviewNote;

    // If approved, retroactively or proactively mark attendance as excused for affected sessions
    if (status === 'approved') {
      const sessions = memoryStore.sessions.filter(
        (s) => s.course_id === req.course_id && s.session_date >= req.start_date && s.session_date <= req.end_date
      );
      for (const sess of sessions) {
        await updateStudentAttendance(sess.id, req.student_id, 'excused', `Approved leave: ${req.reason.substring(0, 40)}`);
      }
    }
    addAuditLog(reviewedBy, 'LEAVE_STATUS_CHANGED', 'LeaveRequest', leaveId, `Marked request as ${status.toUpperCase()}`);
    return req;
  }
  return null;
}

export async function submitLeaveRequest(data: {
  student_id: string;
  course_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  proof_url?: string;
}): Promise<LeaveRequest> {
  const newReq: LeaveRequest = {
    id: `leave-${Date.now()}`,
    student_id: data.student_id,
    course_id: data.course_id,
    start_date: data.start_date,
    end_date: data.end_date,
    reason: data.reason,
    proof_url: data.proof_url,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO leave_requests (id, student_id, course_id, start_date, end_date, reason, proof_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newReq.id, newReq.student_id, newReq.course_id, newReq.start_date, newReq.end_date, newReq.reason, newReq.proof_url || null, newReq.status]
      );
    } catch (e) {
      console.warn('Neon submit leave error:', e);
    }
  }

  memoryStore.leaveRequests.unshift(newReq);
  addAuditLog('Student', 'LEAVE_SUBMITTED', 'LeaveRequest', newReq.id, `Submitted leave for dates ${data.start_date} to ${data.end_date}`);
  return newReq;
}

// Audit Logs
export function addAuditLog(actor: string, action: string, target_type: string, target_id: string, details: string) {
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    actor,
    action,
    target_type,
    target_id,
    details,
    created_at: new Date().toISOString(),
  };
  memoryStore.auditLogs.unshift(log);
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;');
      if (res.rows.length > 0) return res.rows;
    } catch (e) {
      console.warn('Neon audit log error:', e);
    }
  }
  return memoryStore.auditLogs;
}

// User & Authentication queries
export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [normalized]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      console.warn('Neon findUserByEmail query error, using memory fallback:', e);
    }
  }
  const user = memoryStore.users?.find((u) => u.email.toLowerCase() === normalized);
  return user || null;
}

export async function verifyUserPassword(
  email: string,
  plainPassword: string
): Promise<{ success: boolean; user?: User; message?: string }> {
  const user = await findUserByEmail(email);
  if (!user) {
    return { success: false, message: 'Invalid email or password.' };
  }

  if (user.is_active === false) {
    return { success: false, message: 'Your account has been deactivated. Please contact the administrator.' };
  }

  const isMatch = bcrypt.compareSync(plainPassword, user.password_hash);
  if (!isMatch) {
    return { success: false, message: 'Invalid email or password.' };
  }

  return { success: true, user };
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM students WHERE id = $1 OR LOWER(roll_number) = $2 LIMIT 1', [studentId, studentId.toLowerCase()]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      console.warn('Neon getStudentById query error:', e);
    }
  }
  const student = memoryStore.students.find((s) => s.id === studentId || s.roll_number.toLowerCase() === studentId.toLowerCase());
  return student || null;
}

export async function findStudentByRollNumber(rollNumber: string): Promise<Student | null> {
  const normalized = rollNumber.trim().toUpperCase();
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM students WHERE UPPER(roll_number) = $1 LIMIT 1', [normalized]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      console.warn('Neon query findStudentByRollNumber error:', e);
    }
  }
  const student = memoryStore.students.find((s) => s.roll_number.toUpperCase() === normalized);
  return student || null;
}

export async function findStudentByEmail(email: string): Promise<Student | null> {
  const normalized = email.trim().toLowerCase();
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM students WHERE LOWER(email) = $1 LIMIT 1', [normalized]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      console.warn('Neon query findStudentByEmail error:', e);
    }
  }
  const student = memoryStore.students.find((s) => s.email.toLowerCase() === normalized);
  return student || null;
}

export async function enrollNewStudent(data: EnrollStudentInput): Promise<{ student: Student; user: User }> {
  const roll = data.roll_number.trim().toUpperCase();
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();

  // Validate duplicate roll number
  const existingRoll = await findStudentByRollNumber(roll);
  if (existingRoll) {
    throw new Error(`University Roll Number '${roll}' is already assigned to ${existingRoll.name}.`);
  }

  // Validate duplicate email across students and users
  const existingStudentEmail = await findStudentByEmail(email);
  const existingUserEmail = await findUserByEmail(email);
  if (existingStudentEmail || existingUserEmail) {
    throw new Error(`Email address '${email}' is already registered in the system.`);
  }

  if (!data.password || data.password.length < 6) {
    throw new Error('Temporary password must be at least 6 characters long.');
  }

  const studentId = `stu-${Date.now()}`;
  const userId = `user-stu-${Date.now()}`;
  const passwordHash = bcrypt.hashSync(data.password, 10);
  const batchYear = data.batch_year || '2023-2027';

  const newStudent: Student = {
    id: studentId,
    roll_number: roll,
    name,
    email,
    department_id: data.department_id,
    class_id: data.class_id || 'class-1',
    batch_year: batchYear,
    phone: data.phone || undefined,
    is_active: true,
  };

  const newUser: User = {
    id: userId,
    email,
    password_hash: passwordHash,
    name,
    role: 'student',
    student_id: studentId,
    department_id: data.department_id,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query('BEGIN');
      await pool.query(
        `INSERT INTO students (id, roll_number, name, email, department_id, batch_year, phone, class_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [newStudent.id, newStudent.roll_number, newStudent.name, newStudent.email, newStudent.department_id, newStudent.batch_year, newStudent.phone || null, newStudent.class_id, true]
      );
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, student_id, department_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newUser.id, newUser.email, newUser.password_hash, newUser.name, newUser.role, newUser.student_id, newUser.department_id, true]
      );
      await pool.query('COMMIT');
    } catch (e: any) {
      await pool.query('ROLLBACK');
      console.warn('Neon transaction enrollNewStudent failed, using memory fallback:', e);
    }
  }

  // Push to memoryStore fallback
  memoryStore.students.push(newStudent);
  if (!memoryStore.users) memoryStore.users = [];
  memoryStore.users.push(newUser);

  addAuditLog('Admin', 'STUDENT_ENROLLED', 'Student', newStudent.id, `Enrolled student ${name} (${roll}) with student authentication account`);

  return { student: newStudent, user: newUser };
}

export async function updateStudent(id: string, data: UpdateStudentInput): Promise<{ student: Student; user?: User }> {
  const student = memoryStore.students.find((s) => s.id === id);
  if (!student) {
    throw new Error(`Student with ID '${id}' not found.`);
  }

  // If roll number changing, check uniqueness
  if (data.roll_number && data.roll_number.trim().toUpperCase() !== student.roll_number.toUpperCase()) {
    const existing = await findStudentByRollNumber(data.roll_number);
    if (existing && existing.id !== id) {
      throw new Error(`Roll number '${data.roll_number}' is already used by another student.`);
    }
    student.roll_number = data.roll_number.trim().toUpperCase();
  }

  // If email changing, check uniqueness
  if (data.email && data.email.trim().toLowerCase() !== student.email.toLowerCase()) {
    const existing = await findStudentByEmail(data.email);
    if (existing && existing.id !== id) {
      throw new Error(`Email '${data.email}' is already used by another student.`);
    }
    student.email = data.email.trim().toLowerCase();
  }

  if (data.name) student.name = data.name.trim();
  if (data.department_id) student.department_id = data.department_id;
  if (data.batch_year) student.batch_year = data.batch_year;
  if (data.phone !== undefined) student.phone = data.phone;
  if (data.is_active !== undefined) student.is_active = data.is_active;

  // Find matching user
  let user = memoryStore.users?.find((u) => u.student_id === id || u.email.toLowerCase() === student.email.toLowerCase());
  if (user) {
    if (data.name) user.name = student.name;
    if (data.email) user.email = student.email;
    if (data.department_id) user.department_id = student.department_id;
    if (data.is_active !== undefined) user.is_active = data.is_active;
    if (data.password && data.password.trim()) {
      user.password_hash = bcrypt.hashSync(data.password.trim(), 10);
    }
  }

  // Neon update
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `UPDATE students 
         SET name = $1, roll_number = $2, email = $3, department_id = $4, batch_year = $5, phone = $6, is_active = $7
         WHERE id = $8`,
        [student.name, student.roll_number, student.email, student.department_id, student.batch_year, student.phone || null, student.is_active !== false, id]
      );
      if (user) {
        if (data.password && data.password.trim()) {
          await pool.query(
            `UPDATE users SET name = $1, email = $2, department_id = $3, is_active = $4, password_hash = $5 WHERE id = $6`,
            [user.name, user.email, user.department_id, user.is_active !== false, user.password_hash, user.id]
          );
        } else {
          await pool.query(
            `UPDATE users SET name = $1, email = $2, department_id = $3, is_active = $4 WHERE id = $5`,
            [user.name, user.email, user.department_id, user.is_active !== false, user.id]
          );
        }
      }
    } catch (e) {
      console.warn('Neon student update error:', e);
    }
  }

  addAuditLog('Admin', 'STUDENT_UPDATED', 'Student', id, `Updated student record for ${student.name} (${student.roll_number})`);
  return { student, user };
}

export async function toggleStudentStatus(id: string, is_active: boolean): Promise<{ success: boolean; student: Student }> {
  const result = await updateStudent(id, { is_active });
  addAuditLog(
    'Admin',
    is_active ? 'STUDENT_ACTIVATED' : 'STUDENT_DEACTIVATED',
    'Student',
    id,
    `Account status changed to ${is_active ? 'Active' : 'Deactivated'}`
  );
  return { success: true, student: result.student };
}

export async function getAllStudentsWithDetails(courseId?: string): Promise<Student[]> {
  const studentsWithStats = await getStudentsWithStats(courseId);
  return studentsWithStats.map((s) => {
    const dept = memoryStore.departments.find((d) => d.id === s.department_id);
    const cls = memoryStore.classes.find((c) => c.id === s.class_id);
    const user = memoryStore.users?.find((u) => u.student_id === s.id || u.email.toLowerCase() === s.email.toLowerCase());
    return {
      ...s,
      is_active: s.is_active !== false,
      department: dept,
      class: cls,
      user_account: user ? { id: user.id, is_active: user.is_active !== false } : undefined,
    };
  });
}

export async function getStudentPersonalAttendance(studentIdOrEmail: string): Promise<any> {
  const normalized = studentIdOrEmail.trim().toLowerCase();
  const student = memoryStore.students.find(
    (s) => s.id.toLowerCase() === normalized ||
           s.roll_number.toLowerCase() === normalized ||
           s.email.toLowerCase() === normalized
  );

  if (!student) {
    return null;
  }

  // Get department
  const dept = memoryStore.departments.find((d) => d.id === student.department_id);

  // Calculate course-by-course and overall stats
  const coursesData = memoryStore.courses.map((course) => {
    const courseSessions = memoryStore.sessions.filter((sess) => sess.course_id === course.id);
    const totalSessions = courseSessions.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    const sessionRecords = courseSessions.map((sess) => {
      const rec = memoryStore.attendanceRecords.find((r) => r.session_id === sess.id && r.student_id === student.id);
      const status: AttendanceStatus = rec ? rec.status : 'absent';
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else if (status === 'excused') excused++;
      else absent++;

      return {
        session_id: sess.id,
        session_title: sess.title,
        session_date: sess.session_date,
        start_time: sess.start_time,
        end_time: sess.end_time,
        session_type: sess.session_type,
        status,
        check_in_time: rec?.check_in_time,
        remarks: rec?.remarks,
      };
    });

    const percentage = totalSessions > 0 ? Math.round(((present + late * 0.5 + excused) / totalSessions) * 100) : 100;
    const targetPct = course.target_attendance_pct || 75;
    const isEligible = percentage >= targetPct;

    // Consecutive classes needed to reach 75%:
    // (effectivePresent + N) / (total + N) >= 0.75  =>  N >= (0.75 * total - effectivePresent) / 0.25
    const effectivePresent = present + late * 0.5 + excused;
    const classesNeededFor75 = isEligible ? 0 : Math.max(1, Math.ceil((0.75 * totalSessions - effectivePresent) / 0.25));

    return {
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        instructor_name: course.instructor_name,
        target_attendance_pct: targetPct,
      },
      stats: {
        totalSessions,
        present,
        absent,
        late,
        excused,
        percentage,
        isEligible,
        classesNeededFor75,
      },
      records: sessionRecords,
    };
  });

  return {
    student: {
      id: student.id,
      roll_number: student.roll_number,
      name: student.name,
      email: student.email,
      department_id: student.department_id,
      department: dept,
      batch_year: student.batch_year,
      phone: student.phone,
      is_active: student.is_active !== false,
    },
    courses: coursesData,
  };
}

// -------------------------------------------------------------
// FACULTY MANAGEMENT
// -------------------------------------------------------------
export async function getAllFaculty(): Promise<Faculty[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(`
        SELECT f.*, d.name as department_name, d.code as department_code
        FROM faculty f
        LEFT JOIN departments d ON f.department_id = d.id
        ORDER BY f.name ASC;
      `);
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          ...r,
          is_active: r.is_active !== false,
          department: r.department_name ? { id: r.department_id, name: r.department_name, code: r.department_code, faculty_head: '' } : undefined,
        }));
      }
    } catch (e) {
      console.warn('Neon getAllFaculty query error:', e);
    }
  }

  return memoryStore.faculty.map((f) => ({
    ...f,
    department: memoryStore.departments.find((d) => d.id === f.department_id),
  }));
}

export async function getFacultyById(id: string): Promise<Faculty | null> {
  const all = await getAllFaculty();
  return all.find((f) => f.id === id || f.employee_id.toLowerCase() === id.toLowerCase()) || null;
}

export async function findFacultyByEmail(email: string): Promise<Faculty | null> {
  const norm = email.trim().toLowerCase();
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM faculty WHERE LOWER(email) = $1 LIMIT 1', [norm]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      console.warn('Neon findFacultyByEmail error:', e);
    }
  }
  return memoryStore.faculty.find((f) => f.email.toLowerCase() === norm) || null;
}

export async function findFacultyByEmployeeId(empId: string): Promise<Faculty | null> {
  const norm = empId.trim().toUpperCase();
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM faculty WHERE UPPER(employee_id) = $1 LIMIT 1', [norm]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      console.warn('Neon findFacultyByEmployeeId error:', e);
    }
  }
  return memoryStore.faculty.find((f) => f.employee_id.toUpperCase() === norm) || null;
}

export async function createFaculty(data: CreateFacultyInput): Promise<{ faculty: Faculty; user: User }> {
  const empId = data.employee_id.trim().toUpperCase();
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();

  // Validate duplicate employee ID
  const existingEmp = await findFacultyByEmployeeId(empId);
  if (existingEmp) {
    throw new Error(`Employee ID '${empId}' is already assigned to ${existingEmp.name}.`);
  }

  // Validate duplicate email
  const existingEmail = await findFacultyByEmail(email);
  const existingUser = await findUserByEmail(email);
  if (existingEmail || existingUser) {
    throw new Error(`Email address '${email}' is already registered.`);
  }

  if (!data.password || data.password.length < 6) {
    throw new Error('Initial password must be at least 6 characters long.');
  }

  const facultyId = `fac-${Date.now()}`;
  const userId = `user-fac-${Date.now()}`;
  const passwordHash = bcrypt.hashSync(data.password, 10);

  const newFaculty: Faculty = {
    id: facultyId,
    employee_id: empId,
    name,
    email,
    department_id: data.department_id,
    designation: data.designation || 'Assistant Professor',
    phone: data.phone || undefined,
    assigned_course_ids: data.assigned_course_ids || [],
    assigned_class_ids: data.assigned_class_ids || [],
    is_active: true,
  };

  const newUser: User = {
    id: userId,
    email,
    password_hash: passwordHash,
    name,
    role: 'faculty',
    department_id: data.department_id,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query('BEGIN');
      await pool.query(
        `INSERT INTO faculty (id, employee_id, name, email, department_id, designation, phone, assigned_course_ids, assigned_class_ids, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newFaculty.id, newFaculty.employee_id, newFaculty.name, newFaculty.email, newFaculty.department_id, newFaculty.designation, newFaculty.phone || null, newFaculty.assigned_course_ids, newFaculty.assigned_class_ids, true]
      );
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, department_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newUser.id, newUser.email, newUser.password_hash, newUser.name, newUser.role, newUser.department_id, true]
      );
      await pool.query('COMMIT');
    } catch (e: any) {
      await pool.query('ROLLBACK');
      console.warn('Neon createFaculty failed:', e);
    }
  }

  memoryStore.faculty.push(newFaculty);
  if (!memoryStore.users) memoryStore.users = [];
  memoryStore.users.push(newUser);

  addAuditLog('Admin', 'FACULTY_CREATED', 'Faculty', newFaculty.id, `Created faculty account for ${name} (${empId})`);
  return { faculty: newFaculty, user: newUser };
}

export async function updateFaculty(id: string, data: UpdateFacultyInput): Promise<{ faculty: Faculty; user?: User }> {
  const fac = memoryStore.faculty.find((f) => f.id === id);
  if (!fac) {
    throw new Error(`Faculty with ID '${id}' not found.`);
  }

  if (data.employee_id && data.employee_id.trim().toUpperCase() !== fac.employee_id.toUpperCase()) {
    const existing = await findFacultyByEmployeeId(data.employee_id);
    if (existing && existing.id !== id) {
      throw new Error(`Employee ID '${data.employee_id}' is already registered.`);
    }
    fac.employee_id = data.employee_id.trim().toUpperCase();
  }

  if (data.email && data.email.trim().toLowerCase() !== fac.email.toLowerCase()) {
    const existing = await findFacultyByEmail(data.email);
    if (existing && existing.id !== id) {
      throw new Error(`Email '${data.email}' is already in use.`);
    }
    fac.email = data.email.trim().toLowerCase();
  }

  if (data.name) fac.name = data.name.trim();
  if (data.department_id) fac.department_id = data.department_id;
  if (data.designation) fac.designation = data.designation;
  if (data.phone !== undefined) fac.phone = data.phone;
  if (data.is_active !== undefined) fac.is_active = data.is_active;
  if (data.assigned_course_ids) fac.assigned_course_ids = data.assigned_course_ids;
  if (data.assigned_class_ids) fac.assigned_class_ids = data.assigned_class_ids;

  let user = memoryStore.users?.find((u) => u.email.toLowerCase() === fac.email.toLowerCase());
  if (user) {
    if (data.name) user.name = fac.name;
    if (data.email) user.email = fac.email;
    if (data.department_id) user.department_id = fac.department_id;
    if (data.is_active !== undefined) user.is_active = data.is_active;
    if (data.password && data.password.trim()) {
      user.password_hash = bcrypt.hashSync(data.password.trim(), 10);
    }
  }

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `UPDATE faculty 
         SET name = $1, employee_id = $2, email = $3, department_id = $4, designation = $5, phone = $6, is_active = $7, assigned_course_ids = $8, assigned_class_ids = $9
         WHERE id = $10`,
        [fac.name, fac.employee_id, fac.email, fac.department_id, fac.designation, fac.phone || null, fac.is_active !== false, fac.assigned_course_ids, fac.assigned_class_ids, id]
      );
      if (user) {
        await pool.query(
          `UPDATE users SET name = $1, email = $2, department_id = $3, is_active = $4 WHERE id = $5`,
          [user.name, user.email, user.department_id, user.is_active !== false, user.id]
        );
      }
    } catch (e) {
      console.warn('Neon update faculty error:', e);
    }
  }

  addAuditLog('Admin', 'FACULTY_UPDATED', 'Faculty', id, `Updated faculty information for ${fac.name}`);
  return { faculty: fac, user };
}

export async function toggleFacultyStatus(id: string, is_active: boolean): Promise<{ success: boolean; faculty: Faculty }> {
  const result = await updateFaculty(id, { is_active });
  addAuditLog('Admin', is_active ? 'FACULTY_ACTIVATED' : 'FACULTY_DEACTIVATED', 'Faculty', id, `Faculty status changed to ${is_active ? 'Active' : 'Deactivated'}`);
  return { success: true, faculty: result.faculty };
}

// -------------------------------------------------------------
// CLASS MANAGEMENT
// -------------------------------------------------------------
export async function getAllClasses(): Promise<AcademicClass[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(`
        SELECT c.*, d.name as department_name, d.code as department_code,
          (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
        FROM classes c
        LEFT JOIN departments d ON c.department_id = d.id
        ORDER BY c.name ASC;
      `);
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          ...r,
          student_count: parseInt(r.student_count || '0', 10),
          department: r.department_name ? { id: r.department_id, name: r.department_name, code: r.department_code, faculty_head: '' } : undefined,
        }));
      }
    } catch (e) {
      console.warn('Neon getAllClasses error:', e);
    }
  }

  return memoryStore.classes.map((cls) => {
    const studentCount = memoryStore.students.filter((s) => s.class_id === cls.id).length;
    return {
      ...cls,
      student_count: studentCount,
      department: memoryStore.departments.find((d) => d.id === cls.department_id),
    };
  });
}

export async function getClassById(id: string): Promise<AcademicClass | null> {
  const classes = await getAllClasses();
  return classes.find((c) => c.id === id) || null;
}

export async function createClass(data: CreateClassInput): Promise<AcademicClass> {
  const newClass: AcademicClass = {
    id: `class-${Date.now()}`,
    name: data.name.trim(),
    department_id: data.department_id,
    semester: data.semester.trim(),
    academic_year: data.academic_year.trim(),
    student_count: 0,
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO classes (id, name, department_id, semester, academic_year) VALUES ($1, $2, $3, $4, $5)`,
        [newClass.id, newClass.name, newClass.department_id, newClass.semester, newClass.academic_year]
      );
    } catch (e) {
      console.warn('Neon createClass error:', e);
    }
  }

  memoryStore.classes.push(newClass);
  addAuditLog('Admin', 'CLASS_CREATED', 'Class', newClass.id, `Created academic class ${newClass.name}`);
  return newClass;
}

// -------------------------------------------------------------
// SUBJECT (COURSE) ASSIGNMENTS
// -------------------------------------------------------------
export async function getAllSubjectAssignments(): Promise<SubjectAssignment[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(`
        SELECT sa.*, 
               c.code as course_code, c.title as course_title,
               f.name as faculty_name, f.employee_id as faculty_employee_id,
               cls.name as class_name
        FROM subject_assignments sa
        JOIN courses c ON sa.course_id = c.id
        JOIN faculty f ON sa.faculty_id = f.id
        JOIN classes cls ON sa.class_id = cls.id
        ORDER BY c.code ASC;
      `);
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          id: r.id,
          course_id: r.course_id,
          faculty_id: r.faculty_id,
          class_id: r.class_id,
          course: { id: r.course_id, code: r.course_code, title: r.course_title, department_id: '', instructor_name: '', instructor_email: '', room: '', schedule_days: [], schedule_time: '', semester: '', target_attendance_pct: 75 },
          faculty: { id: r.faculty_id, name: r.faculty_name, employee_id: r.faculty_employee_id, email: '', department_id: '', designation: '', assigned_course_ids: [], assigned_class_ids: [], is_active: true },
          class: { id: r.class_id, name: r.class_name, department_id: '', semester: '', academic_year: '' },
        }));
      }
    } catch (e) {
      console.warn('Neon getAllSubjectAssignments error:', e);
    }
  }

  return memoryStore.subjectAssignments.map((a) => ({
    ...a,
    course: memoryStore.courses.find((c) => c.id === a.course_id),
    faculty: memoryStore.faculty.find((f) => f.id === a.faculty_id),
    class: memoryStore.classes.find((cls) => cls.id === a.class_id),
  }));
}

export async function assignFacultyToSubject(courseId: string, facultyId: string, classId: string): Promise<SubjectAssignment> {
  const existing = memoryStore.subjectAssignments.find(
    (a) => a.course_id === courseId && a.faculty_id === facultyId && a.class_id === classId
  );
  if (existing) {
    return existing;
  }

  const newAssignment: SubjectAssignment = {
    id: `assign-${Date.now()}`,
    course_id: courseId,
    faculty_id: facultyId,
    class_id: classId,
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO subject_assignments (id, course_id, faculty_id, class_id) VALUES ($1, $2, $3, $4)
         ON CONFLICT (course_id, faculty_id, class_id) DO NOTHING`,
        [newAssignment.id, newAssignment.course_id, newAssignment.faculty_id, newAssignment.class_id]
      );
    } catch (e) {
      console.warn('Neon assignFacultyToSubject error:', e);
    }
  }

  memoryStore.subjectAssignments.push(newAssignment);
  // Also update faculty's assigned_course_ids and assigned_class_ids
  const faculty = memoryStore.faculty.find((f) => f.id === facultyId);
  if (faculty) {
    if (!faculty.assigned_course_ids) faculty.assigned_course_ids = [];
    if (!faculty.assigned_class_ids) faculty.assigned_class_ids = [];
    if (!faculty.assigned_course_ids.includes(courseId)) faculty.assigned_course_ids.push(courseId);
    if (!faculty.assigned_class_ids.includes(classId)) faculty.assigned_class_ids.push(classId);
  }

  addAuditLog('Admin', 'SUBJECT_ASSIGNED', 'SubjectAssignment', newAssignment.id, `Assigned course ${courseId} to faculty ${facultyId} for class ${classId}`);
  return newAssignment;
}

export async function removeSubjectAssignment(id: string): Promise<boolean> {
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query('DELETE FROM subject_assignments WHERE id = $1', [id]);
    } catch (e) {
      console.warn('Neon removeSubjectAssignment error:', e);
    }
  }
  const idx = memoryStore.subjectAssignments.findIndex((a) => a.id === id);
  if (idx !== -1) {
    memoryStore.subjectAssignments.splice(idx, 1);
  }
  return true;
}

// -------------------------------------------------------------
// LECTURE MANAGEMENT & ATTENDANCE LIFECYCLE (REQUIREMENTS 6, 7 & 8)
// -------------------------------------------------------------
export async function getFacultyLectures(facultyId?: string, courseId?: string): Promise<Session[]> {
  let sessions = [...memoryStore.sessions];
  if (courseId) {
    sessions = sessions.filter((s) => s.course_id === courseId);
  }
  if (facultyId) {
    sessions = sessions.filter((s) => s.faculty_id === facultyId || !s.faculty_id);
  }

  // Sort by date DESC and start_time DESC
  sessions.sort((a, b) => {
    const da = `${a.session_date} ${a.start_time}`;
    const db = `${b.session_date} ${b.start_time}`;
    return db.localeCompare(da);
  });

  return sessions.map((s) => {
    const records = memoryStore.attendanceRecords.filter((r) => r.session_id === s.id);
    const present = records.filter((r) => r.status === 'present').length;
    const late = records.filter((r) => r.status === 'late').length;
    const excused = records.filter((r) => r.status === 'excused').length;
    const absent = records.filter((r) => r.status === 'absent').length;

    // Determine pending
    const enrolledStudents = s.class_id
      ? memoryStore.students.filter((stu) => stu.class_id === s.class_id)
      : memoryStore.students;
    
    // If lecture is still active, any enrolled student without a record is pending
    const totalPending = !s.is_closed ? Math.max(0, enrolledStudents.length - records.length) : 0;

    return {
      ...s,
      total_present: present,
      total_late: late,
      total_excused: excused,
      total_absent: absent,
      total_pending: totalPending,
      course: memoryStore.courses.find((c) => c.id === s.course_id),
      class: memoryStore.classes.find((cls) => cls.id === s.class_id),
      faculty: memoryStore.faculty.find((f) => f.id === s.faculty_id),
    };
  });
}

export async function createLecture(data: CreateLectureInput, facultyId?: string): Promise<Session> {
  const course = memoryStore.courses.find((c) => c.id === data.course_id);
  const now = Date.now();
  // Generate initial 15-second dynamic QR token
  const qrToken = `CADENCE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const qrExpiresAt = new Date(now + 15 * 1000).toISOString();

  // Calculate end_time based on start_time and duration_minutes
  let endTime = '10:00';
  try {
    const [hStr, mStr] = data.start_time.split(':');
    const totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + data.duration_minutes;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  } catch (e) {
    endTime = '10:00';
  }

  const newSession: Session = {
    id: `sess-${now}`,
    course_id: data.course_id,
    class_id: data.class_id || 'class-1',
    faculty_id: facultyId || 'fac-1',
    lecture_number: data.lecture_number,
    topic: data.topic,
    duration_minutes: data.duration_minutes,
    session_date: data.session_date,
    start_time: data.start_time,
    end_time: endTime,
    title: `${course?.code || 'CS'} - Lecture #${data.lecture_number}: ${data.topic}`,
    session_type: data.session_type || 'lecture',
    qr_token: qrToken,
    qr_expires_at: qrExpiresAt,
    is_closed: false,
    status: 'active',
    total_present: 0,
    total_absent: 0,
    total_late: 0,
    total_excused: 0,
    total_pending: 0,
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO sessions (id, course_id, class_id, faculty_id, lecture_number, topic, duration_minutes, session_date, start_time, end_time, title, session_type, qr_token, qr_expires_at, is_closed, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          newSession.id,
          newSession.course_id,
          newSession.class_id,
          newSession.faculty_id,
          newSession.lecture_number,
          newSession.topic,
          newSession.duration_minutes,
          newSession.session_date,
          newSession.start_time,
          newSession.end_time,
          newSession.title,
          newSession.session_type,
          newSession.qr_token,
          newSession.qr_expires_at,
          false,
          'active',
        ]
      );
    } catch (e) {
      console.warn('Neon createLecture error:', e);
    }
  }

  // NOTE (Requirement 8): Do NOT mark students absent at lecture launch!
  // While active, unverified students are pending.
  memoryStore.sessions.unshift(newSession);

  // Increment course total_sessions
  if (course) {
    course.total_sessions = (course.total_sessions || 0) + 1;
  }

  addAuditLog(facultyId || 'Faculty', 'LECTURE_STARTED', 'Session', newSession.id, `Started Lecture #${data.lecture_number}: "${data.topic}" for class ${newSession.class_id}`);
  return newSession;
}

export async function refreshSessionQR(sessionId: string): Promise<{ qr_token: string; qr_expires_at: string }> {
  const session = memoryStore.sessions.find((s) => s.id === sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  if (session.is_closed || session.status === 'closed') {
    throw new Error('Cannot rotate QR token for a closed lecture.');
  }

  const newToken = `CADENCE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const newExpiry = new Date(Date.now() + 15 * 1000).toISOString();

  session.qr_token = newToken;
  session.qr_expires_at = newExpiry;

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query('UPDATE sessions SET qr_token = $1, qr_expires_at = $2 WHERE id = $3', [newToken, newExpiry, sessionId]);
    } catch (e) {
      console.warn('Neon refreshSessionQR error:', e);
    }
  }

  return { qr_token: newToken, qr_expires_at: newExpiry };
}

export async function closeLecture(sessionId: string, actorName: string = 'Faculty'): Promise<{ success: boolean; session: Session; absentCount: number }> {
  const session = memoryStore.sessions.find((s) => s.id === sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  session.is_closed = true;
  session.status = 'closed';
  session.qr_token = undefined;

  // REQUIREMENT 8: Automatically transition unrecorded students to 'Absent'
  // Find all enrolled students for this session's class (or all students if none set)
  const enrolled = session.class_id
    ? memoryStore.students.filter((s) => (s.class_id || 'class-1') === session.class_id && s.is_active !== false)
    : memoryStore.students.filter((s) => s.is_active !== false);

  let autoAbsentCount = 0;
  const pool = getPgPool();

  for (const stu of enrolled) {
    const existing = memoryStore.attendanceRecords.find((r) => r.session_id === sessionId && r.student_id === stu.id);
    if (!existing) {
      // Mark absent automatically
      const absentRec: AttendanceRecord = {
        id: `att-${sessionId}-${stu.id}`,
        session_id: sessionId,
        student_id: stu.id,
        status: 'absent',
        remarks: 'Auto-marked absent on lecture conclusion',
        updated_by: 'System (Lecture Close)',
        updated_at: new Date().toISOString(),
      };
      memoryStore.attendanceRecords.push(absentRec);
      autoAbsentCount++;

      if (pool) {
        try {
          await pool.query(
            `INSERT INTO attendance_records (id, session_id, student_id, status, remarks, updated_by, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (session_id, student_id) DO NOTHING`,
            [absentRec.id, absentRec.session_id, absentRec.student_id, absentRec.status, absentRec.remarks, absentRec.updated_by]
          );
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  if (pool) {
    try {
      await pool.query('UPDATE sessions SET is_closed = TRUE, status = $1, qr_token = NULL WHERE id = $2', ['closed', sessionId]);
    } catch (e) {
      console.warn('Neon closeLecture error:', e);
    }
  }

  addAuditLog(actorName, 'LECTURE_CLOSED', 'Session', sessionId, `Lecture closed. Converted ${autoAbsentCount} pending students to Absent.`);
  return { success: true, session, absentCount: autoAbsentCount };
}

export async function getLectureRoster(sessionId: string): Promise<{
  session: Session;
  students: Array<{
    student: Student;
    status: AttendanceStatus | 'pending';
    check_in_time?: string;
    remarks?: string;
    updated_by?: string;
  }>;
  stats: {
    totalEnrolled: number;
    present: number;
    pending: number;
    absent: number;
    late: number;
    excused: number;
    attendancePct: number;
  };
}> {
  const session = memoryStore.sessions.find((s) => s.id === sessionId);
  if (!session) {
    throw new Error('Lecture session not found.');
  }

  // Get enrolled students for class
  const enrolled = session.class_id
    ? memoryStore.students.filter((s) => (s.class_id || 'class-1') === session.class_id)
    : memoryStore.students;

  let present = 0;
  let pending = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;

  const rosterList = enrolled.map((stu) => {
    const rec = memoryStore.attendanceRecords.find((r) => r.session_id === sessionId && r.student_id === stu.id);
    let st: AttendanceStatus | 'pending' = 'pending';

    if (rec) {
      st = rec.status;
      if (st === 'present') present++;
      else if (st === 'late') late++;
      else if (st === 'excused') excused++;
      else if (st === 'absent') absent++;
    } else {
      if (session.is_closed || session.status === 'closed') {
        st = 'absent';
        absent++;
      } else {
        st = 'pending';
        pending++;
      }
    }

    return {
      student: stu,
      status: st,
      check_in_time: rec?.check_in_time,
      remarks: rec?.remarks,
      updated_by: rec?.updated_by,
    };
  });

  const total = enrolled.length || 1;
  const attendancePct = Math.round(((present + late * 0.75 + excused) / total) * 100);

  return {
    session: {
      ...session,
      course: memoryStore.courses.find((c) => c.id === session.course_id),
      class: memoryStore.classes.find((c) => c.id === session.class_id),
    },
    students: rosterList,
    stats: {
      totalEnrolled: enrolled.length,
      present,
      pending,
      absent,
      late,
      excused,
      attendancePct,
    },
  };
}

export async function correctLectureAttendance(
  sessionId: string,
  studentId: string,
  newStatus: AttendanceStatus,
  reason: string,
  facultyName: string
): Promise<AttendanceRecord> {
  if (!reason || !reason.trim()) {
    throw new Error('Mandatory correction reason is required for manual attendance override.');
  }

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const pool = getPgPool();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO attendance_records (id, session_id, student_id, status, check_in_time, remarks, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (session_id, student_id)
         DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [`att-${sessionId}-${studentId}`, sessionId, studentId, newStatus, timeStr, `Manual correction: ${reason.trim()}`, facultyName]
      );
    } catch (e) {
      console.warn('Neon manual correction error:', e);
    }
  }

  let rec = memoryStore.attendanceRecords.find((r) => r.session_id === sessionId && r.student_id === studentId);
  if (!rec) {
    rec = {
      id: `att-${sessionId}-${studentId}`,
      session_id: sessionId,
      student_id: studentId,
      status: newStatus,
      check_in_time: timeStr,
      remarks: `Manual correction: ${reason.trim()}`,
      updated_by: facultyName,
      updated_at: new Date().toISOString(),
    };
    memoryStore.attendanceRecords.push(rec);
  } else {
    rec.status = newStatus;
    rec.remarks = `Manual correction: ${reason.trim()}`;
    rec.updated_by = facultyName;
    rec.updated_at = new Date().toISOString();
  }

  const stu = memoryStore.students.find((s) => s.id === studentId);
  addAuditLog(facultyName, 'MANUAL_ATTENDANCE_OVERRIDE', 'AttendanceRecord', rec.id, `Corrected ${stu?.name || studentId} to ${newStatus.toUpperCase()}. Reason: "${reason.trim()}"`);
  return rec;
}

// -------------------------------------------------------------
// SECURE ZERO-TRUST QR CODE VERIFICATION (REQUIREMENT 7 & 8)
// -------------------------------------------------------------
export async function verifyStudentLectureScan(
  qrToken: string,
  user: { id: string; student_id?: string; email: string; name: string }
): Promise<{ success: boolean; message: string; lecture?: any; timestamp?: string }> {
  const normToken = qrToken.trim();

  // 1. Locate active session
  const session = memoryStore.sessions.find(
    (s) => s.qr_token === normToken && !s.is_closed && s.status !== 'closed'
  );

  if (!session) {
    return { success: false, message: 'Invalid, inactive, or closed lecture QR code.' };
  }

  // 2. Expiration check (15s rotation window with 5s network grace tolerance)
  if (session.qr_expires_at) {
    const expiresMs = new Date(session.qr_expires_at).getTime();
    if (Date.now() > expiresMs + 5000) {
      return { success: false, message: 'QR Code has expired (15-second rotation). Please scan the current code.' };
    }
  }

  // 3. Match student
  const dbUser = memoryStore.users?.find(
    (u) => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id
  );
  const student = memoryStore.students.find(
    (s) =>
      s.id === user.student_id ||
      s.id === dbUser?.student_id ||
      (user.student_id && s.roll_number.toLowerCase() === user.student_id.toLowerCase()) ||
      s.email.toLowerCase() === user.email.toLowerCase()
  );

  if (!student) {
    return { success: false, message: 'Authenticated user is not linked to a student institutional profile.' };
  }

  if (student.is_active === false) {
    return { success: false, message: 'Your student account has been deactivated by administration.' };
  }

  // 4. Enrollment check
  if (session.class_id && student.class_id && session.class_id !== student.class_id) {
    const cls = memoryStore.classes.find((c) => c.id === session.class_id);
    return { success: false, message: `This lecture is reserved for class: ${cls?.name || session.class_id}. You are not enrolled.` };
  }

  // 5. Duplicate check
  const existingRecord = memoryStore.attendanceRecords.find(
    (r) => r.session_id === session.id && r.student_id === student.id
  );

  if (existingRecord && existingRecord.status === 'present') {
    return { success: false, message: 'Duplicate scan rejected: Your attendance is already recorded as Present.' };
  }

  // 6. Record attendance
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const pool = getPgPool();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO attendance_records (id, session_id, student_id, status, check_in_time, remarks, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (session_id, student_id)
         DO UPDATE SET status = EXCLUDED.status, check_in_time = EXCLUDED.check_in_time, remarks = EXCLUDED.remarks, updated_at = NOW()`,
        [`att-${session.id}-${student.id}`, session.id, student.id, 'present', timeStr, 'Verified via 15s Dynamic QR Token', student.name]
      );
    } catch (e) {
      console.warn('Neon QR scan insert error:', e);
    }
  }

  if (!existingRecord) {
    memoryStore.attendanceRecords.push({
      id: `att-${session.id}-${student.id}`,
      session_id: session.id,
      student_id: student.id,
      status: 'present',
      check_in_time: timeStr,
      remarks: 'Verified via 15s Dynamic QR Token',
      updated_by: student.name,
      updated_at: new Date().toISOString(),
    });
  } else {
    existingRecord.status = 'present';
    existingRecord.check_in_time = timeStr;
    existingRecord.remarks = 'Verified via 15s Dynamic QR Token';
    existingRecord.updated_by = student.name;
    existingRecord.updated_at = new Date().toISOString();
  }

  const course = memoryStore.courses.find((c) => c.id === session.course_id);
  addAuditLog(student.name, 'SELF_QR_SCAN_VERIFIED', 'Session', session.id, `Recorded Present for Lecture #${session.lecture_number || 1} (${course?.code || 'Course'})`);

  return {
    success: true,
    message: `Attendance marked Present for ${course?.code || ''}: Lecture #${session.lecture_number || 1} (${session.topic || session.title})`,
    timestamp: timeStr,
    lecture: {
      id: session.id,
      topic: session.topic || session.title,
      lecture_number: session.lecture_number || 1,
      course_title: course?.title,
      course_code: course?.code,
    },
  };
}

// -------------------------------------------------------------
// INSTITUTIONAL ADMIN REPORTS & ANALYTICS (REQUIREMENT 11)
// -------------------------------------------------------------
export async function getAdminReportSummary(): Promise<{
  counts: {
    totalStudents: number;
    activeStudents: number;
    totalFaculty: number;
    activeFaculty: number;
    totalSubjects: number;
    totalClasses: number;
    totalLectures: number;
    activeLectures: number;
    overallAttendancePct: number;
  };
  subjectStats: Array<{
    id: string;
    code: string;
    title: string;
    instructor_name: string;
    totalSessions: number;
    avgAttendancePct: number;
  }>;
  facultyStats: Array<{
    id: string;
    name: string;
    employee_id: string;
    department: string;
    lecturesConducted: number;
  }>;
  attendanceDistribution: {
    good: number;
    warning: number;
    critical: number;
  };
}> {
  const students = await getAllStudentsWithDetails();
  const faculty = await getAllFaculty();
  const courses = await getCourses();
  const classes = await getAllClasses();
  const sessions = memoryStore.sessions;
  const records = memoryStore.attendanceRecords;

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.is_active !== false).length;
  const totalFaculty = faculty.length;
  const activeFaculty = faculty.filter((f) => f.is_active !== false).length;
  const totalSubjects = courses.length;
  const totalClasses = classes.length;
  const totalLectures = sessions.length;
  const activeLectures = sessions.filter((s) => !s.is_closed && s.status !== 'closed').length;

  const presentRecords = records.filter((r) => r.status === 'present').length;
  const totalRecords = records.length || 1;
  const overallAttendancePct = Math.round((presentRecords / totalRecords) * 100);

  // Subject statistics
  const subjectStats = courses.map((c) => {
    const courseSessions = sessions.filter((s) => s.course_id === c.id);
    const sessionIds = new Set(courseSessions.map((s) => s.id));
    const courseRecords = records.filter((r) => sessionIds.has(r.session_id));
    const present = courseRecords.filter((r) => r.status === 'present').length;
    const avgAttendancePct = courseRecords.length > 0 ? Math.round((present / courseRecords.length) * 100) : 85;

    return {
      id: c.id,
      code: c.code,
      title: c.title,
      instructor_name: c.instructor_name,
      totalSessions: courseSessions.length,
      avgAttendancePct,
    };
  });

  // Faculty statistics
  const facultyStats = faculty.map((f) => {
    const facSessions = sessions.filter((s) => s.faculty_id === f.id);
    const dept = memoryStore.departments.find((d) => d.id === f.department_id);
    return {
      id: f.id,
      name: f.name,
      employee_id: f.employee_id,
      department: dept?.name || 'Computer Science',
      lecturesConducted: facSessions.length,
    };
  });

  // Attendance distribution
  let good = 0;
  let warning = 0;
  let critical = 0;

  students.forEach((stu) => {
    const pct = stu.stats?.percentage ?? 80;
    if (pct >= 85) good++;
    else if (pct >= 75) warning++;
    else critical++;
  });

  return {
    counts: {
      totalStudents,
      activeStudents,
      totalFaculty,
      activeFaculty,
      totalSubjects,
      totalClasses,
      totalLectures,
      activeLectures,
      overallAttendancePct,
    },
    subjectStats,
    facultyStats,
    attendanceDistribution: { good, warning, critical },
  };
}


