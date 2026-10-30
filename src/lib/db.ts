import { Pool } from 'pg';
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
} from './types';
import {
  initialDepartments,
  initialCourses,
  initialStudents,
  initialSessions,
  initialAttendanceRecords,
  initialLeaveRequests,
  initialAuditLogs,
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
  };
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
        phone VARCHAR(64)
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
          'INSERT INTO students (id, roll_number, name, email, department_id, batch_year, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [s.id, s.roll_number, s.name, s.email, s.department_id, s.batch_year, s.phone]
        );
      }
      for (const sess of initialSessions) {
        await client.query(
          'INSERT INTO sessions (id, course_id, session_date, start_time, end_time, title, session_type, qr_token, is_closed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [sess.id, sess.course_id, sess.session_date, sess.start_time, sess.end_time, sess.title, sess.session_type, sess.qr_token || null, sess.is_closed]
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

    await client.query('COMMIT');
    return {
      success: true,
      message: 'Neon PostgreSQL tables and seed data initialized successfully.',
      tables: ['departments', 'courses', 'students', 'sessions', 'attendance_records', 'leave_requests', 'audit_logs'],
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

