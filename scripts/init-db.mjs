import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';
const { Pool } = pg;

// Load environment variables from .env.local if present
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Error: DATABASE_URL not found in environment or .env.local');
  process.exit(1);
}

console.log('⚡ Connecting to Neon Lakebase Postgres...');
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('📦 Initializing schema on Neon branch:', process.env.NEON_BRANCH || 'production');
    await client.query('BEGIN');

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

      CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department_id VARCHAR(64) REFERENCES departments(id) ON DELETE CASCADE,
        semester VARCHAR(64) NOT NULL,
        academic_year VARCHAR(64) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
        class_id VARCHAR(64) REFERENCES classes(id) ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
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
        lecture_number INT,
        topic VARCHAR(255),
        class_id VARCHAR(64) REFERENCES classes(id) ON DELETE SET NULL,
        faculty_id VARCHAR(64) REFERENCES faculty(id) ON DELETE SET NULL,
        duration_minutes INT,
        status VARCHAR(32) DEFAULT 'active',
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

    // Seed departments if empty
    const deptCheck = await client.query('SELECT COUNT(*) FROM departments');
    if (parseInt(deptCheck.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial departments, courses, students, and users...');
      await client.query(`
        INSERT INTO departments (id, code, name, faculty_head) VALUES
        ('dept-1', 'CS', 'Computer Science & Engineering', 'Dr. Alistair Vance'),
        ('dept-2', 'MATH', 'Mathematics & Computing', 'Prof. Elena Rostova'),
        ('dept-3', 'EE', 'Electrical Engineering', 'Dr. Marcus Thorne');

        INSERT INTO courses (id, code, title, department_id, instructor_name, instructor_email, room, schedule_days, schedule_time, semester, target_attendance_pct, total_sessions) VALUES
        ('course-1', 'CS-401', 'Advanced Distributed Systems', 'dept-1', 'Dr. Alistair Vance', 'faculty@cadence.edu', 'Turing Hall 304', '{"Mon","Wed","Fri"}', '10:00 - 11:30 AM', 'Fall 2026', 75, 24),
        ('course-2', 'CS-308', 'Neural Networks & Deep Architectures', 'dept-1', 'Dr. Sophia Lin', 'faculty@cadence.edu', 'Ada Lovelace Lab 102', '{"Tue","Thu"}', '02:00 - 03:45 PM', 'Fall 2026', 80, 18),
        ('course-3', 'CS-205', 'Data Structures & Algorithms', 'dept-1', 'Prof. Elena Rostova', 'faculty@cadence.edu', 'Babbage Auditorium', '{"Mon","Wed"}', '09:00 - 10:30 AM', 'Fall 2026', 75, 20);

        INSERT INTO classes (id, name, department_id, semester, academic_year) VALUES
        ('class-1', 'CS-Year3-SecA', 'dept-1', 'Semester 5', '2024-2025'),
        ('class-2', 'CS-Year3-SecB', 'dept-1', 'Semester 5', '2024-2025'),
        ('class-3', 'EE-Year2-SecA', 'dept-3', 'Semester 3', '2024-2025');

        INSERT INTO students (id, roll_number, name, email, department_id, batch_year, phone, class_id) VALUES
        ('stu-1', 'CS2023-001', 'Arjun Mehta', 'student@cadence.edu', 'dept-1', '2023-2027', '+1 (555) 019-4820', 'class-1'),
        ('stu-2', 'CS2023-002', 'Priya Sharma', 'priya.s@cadence.edu', 'dept-1', '2023-2027', '+1 (555) 019-4821', 'class-1'),
        ('stu-3', 'CS2023-003', 'Liam Chen', 'liam.c@cadence.edu', 'dept-1', '2023-2027', '+1 (555) 019-4822', 'class-1');

        INSERT INTO faculty (id, employee_id, name, email, department_id, designation, phone, assigned_course_ids, assigned_class_ids) VALUES
        ('fac-1', 'EMP-CS-101', 'Dr. Aris Vandenberg', 'faculty@cadence.edu', 'dept-1', 'Associate Professor', '+1 (555) 019-2831', '{"course-1","course-2"}', '{"class-1","class-2"}'),
        ('fac-2', 'EMP-CS-102', 'Dr. Alistair Vance', 'vance@cadence.edu', 'dept-1', 'Professor & Department Head', '+1 (555) 019-2832', '{"course-1"}', '{"class-1"}');

        INSERT INTO subject_assignments (id, course_id, faculty_id, class_id) VALUES
        ('assign-1', 'course-1', 'fac-1', 'class-1'),
        ('assign-2', 'course-2', 'fac-1', 'class-1');

        INSERT INTO users (id, email, password_hash, name, role, student_id, department_id) VALUES
        ('user-admin-1', 'admin@cadence.edu', '$2b$10$DS/WGpAkfTaUPPDZWdnyouXJeHxMuagq4RBL5zEg0xEB8sA/Orf2u', 'Dr. Evelyn Vance', 'admin', NULL, 'dept-1'),
        ('user-fac-1', 'faculty@cadence.edu', '$2b$10$2o3K4NbG58nMRHOc3TrPIOPI7.k2WF/kh55uMsr3xTEjxzU0QVnDy', 'Dr. Aris Vandenberg', 'faculty', NULL, 'dept-1'),
        ('user-stu-1', 'student@cadence.edu', '$2b$10$6Vwbuht3ThoDt1f.02HNsOs.4RJ84BzqALh9wVF3m.EmRaYeqlPcG', 'Arjun Mehta', 'student', 'stu-1', 'dept-1');
      `);
    }

    await client.query('COMMIT');
    console.log('✅ Schema & seed data verified on Neon.');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📋 Verified Tables in Neon PostgreSQL:');
    res.rows.forEach(r => console.log('   - ' + r.table_name));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Schema initialization error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
