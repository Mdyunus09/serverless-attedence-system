import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Cadence Serverless Attendance Management System Verification\n');

  // Helper for cookie-based session requests
  class SessionClient {
    constructor(label) {
      this.label = label;
      this.cookie = '';
    }

    async fetch(url, options = {}) {
      const headers = { ...(options.headers || {}) };
      if (this.cookie) {
        headers['Cookie'] = this.cookie;
      }
      const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
      const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || ''];
      for (const sc of rawCookies) {
        const match = sc.match(/(cadence_auth_session=[^;]+)/);
        if (match) {
          this.cookie = match[1];
        }
      }
      return res;
    }

    async postJson(url, data) {
      return this.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }

    async patchJson(url, data) {
      return this.fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }

    async getJson(url) {
      const res = await this.fetch(url);
      return res.json();
    }
  }

  // -----------------------------------------------------------
  // 1. ROLE-BASED AUTHENTICATION TESTS
  // -----------------------------------------------------------
  console.log('--- 1. Testing Role-Based Authentication ---');

  // A. Admin Login
  const adminClient = new SessionClient('Admin');
  let res = await adminClient.postJson('/api/auth/login', {
    email: 'admin@cadence.edu',
    password: 'admin123',
  });
  let data = await res.json();
  assert(res.ok && data.success, 'Admin login failed');
  assert.strictEqual(data.user.role, 'admin');
  console.log('✅ Admin login verified:', data.user.name, `(${data.user.role})`);

  // Verify Admin Session persistence
  let meData = await adminClient.getJson('/api/auth/me');
  console.log('DEBUG: admin cookie =', adminClient.cookie, 'meData =', meData);
  assert.strictEqual(meData.user?.role, 'admin');
  console.log('✅ Admin session persistence verified');

  // B. Faculty Login
  const facultyClient = new SessionClient('Faculty');
  res = await facultyClient.postJson('/api/auth/login', {
    email: 'faculty@cadence.edu',
    password: 'faculty123',
  });
  data = await res.json();
  assert(res.ok && data.success, 'Faculty login failed');
  assert.strictEqual(data.user.role, 'faculty');
  console.log('✅ Faculty login verified:', data.user.name, `(${data.user.role})`);

  // C. Student Login
  const studentClient = new SessionClient('Student');
  res = await studentClient.postJson('/api/auth/login', {
    email: 'student@cadence.edu',
    password: 'student123',
  });
  data = await res.json();
  assert(res.ok && data.success, 'Student login failed');
  assert.strictEqual(data.user.role, 'student');
  console.log('✅ Student login verified:', data.user.name, `(${data.user.role})`);

  // D. Invalid Credentials
  const badClient = new SessionClient('Bad');
  res = await badClient.postJson('/api/auth/login', {
    email: 'admin@cadence.edu',
    password: 'wrongpassword',
  });
  assert(!res.ok, 'Invalid login should have failed');
  console.log('✅ Invalid password correctly rejected');

  // -----------------------------------------------------------
  // 2. STUDENT MANAGEMENT TESTS (ADMIN ONLY)
  // -----------------------------------------------------------
  console.log('\n--- 2. Testing Student Management & Account Provisioning ---');
  const testRoll = `TEST-ROLL-${Date.now().toString().slice(-4)}`;
  const testEmail = `teststudent_${Date.now()}@cadence.edu`;

  // Admin registers new student
  res = await adminClient.postJson('/api/students', {
    name: 'Rohan Sharma',
    roll_number: testRoll,
    email: testEmail,
    department_id: 'dept-1',
    class_id: 'class-1',
    password: 'tempPassword123!',
  });
  data = await res.json();
  assert(res.ok && data.success, 'Student enrollment failed');
  const createdStudentId = data.student.id;
  console.log('✅ New student enrolled:', data.student.name, `(${data.student.roll_number})`);

  // Verify newly created student can immediately log in
  const newStudentClient = new SessionClient('NewStudent');
  res = await newStudentClient.postJson('/api/auth/login', {
    email: testEmail,
    password: 'tempPassword123!',
  });
  data = await res.json();
  assert(res.ok && data.success, 'New student login failed');
  assert.strictEqual(data.user.role, 'student');
  console.log('✅ Newly created student logged in successfully with provisioned credentials');

  // Verify duplicate prevention (same roll number)
  res = await adminClient.postJson('/api/students', {
    name: 'Duplicate Student',
    roll_number: testRoll,
    email: `other_${Date.now()}@cadence.edu`,
    department_id: 'dept-1',
    password: 'tempPassword123!',
  });
  assert(!res.ok, 'Duplicate roll number should be rejected');
  console.log('✅ Duplicate roll number correctly rejected by server');

  // Deactivate student account
  res = await adminClient.patchJson(`/api/students/${createdStudentId}`, { is_active: false });
  assert(res.ok, 'Student deactivation failed');
  console.log('✅ Student account deactivated by Admin');

  // Verify deactivated student cannot log in
  res = await newStudentClient.postJson('/api/auth/login', {
    email: testEmail,
    password: 'tempPassword123!',
  });
  assert(!res.ok, 'Deactivated student should not be able to log in');
  console.log('✅ Deactivated student login blocked');

  // Reactivate student account
  await adminClient.patchJson(`/api/students/${createdStudentId}`, { is_active: true });
  console.log('✅ Student account reactivated');

  // -----------------------------------------------------------
  // 3. FACULTY MANAGEMENT TESTS (ADMIN ONLY)
  // -----------------------------------------------------------
  console.log('\n--- 3. Testing Faculty Management ---');
  const testEmpId = `FAC-EMP-${Date.now().toString().slice(-4)}`;
  const testFacEmail = `prof_${Date.now()}@cadence.edu`;

  // Admin registers new faculty
  res = await adminClient.postJson('/api/faculty', {
    name: 'Prof. Anya Petrova',
    employee_id: testEmpId,
    email: testFacEmail,
    department_id: 'dept-1',
    designation: 'Associate Professor',
    password: 'profPassword123!',
  });
  data = await res.json();
  assert(res.ok, 'Faculty creation failed: ' + (data.error || ''));
  const createdFacId = data.faculty.id;
  console.log('✅ New faculty account created:', data.faculty.name, `(${data.faculty.employee_id})`);

  // Verify new faculty can log in
  const newFacClient = new SessionClient('NewFaculty');
  res = await newFacClient.postJson('/api/auth/login', {
    email: testFacEmail,
    password: 'profPassword123!',
  });
  data = await res.json();
  assert(res.ok && data.success, 'New faculty login failed');
  assert.strictEqual(data.user.role, 'faculty');
  console.log('✅ Newly created faculty logged in successfully');

  // Deactivate faculty
  res = await adminClient.patchJson(`/api/faculty/${createdFacId}`, { is_active: false });
  assert(res.ok, 'Faculty deactivation failed');
  console.log('✅ Faculty account deactivated');

  // Verify deactivated faculty login blocked
  res = await newFacClient.postJson('/api/auth/login', {
    email: testFacEmail,
    password: 'profPassword123!',
  });
  assert(!res.ok, 'Deactivated faculty should not log in');
  console.log('✅ Deactivated faculty login blocked');

  // Reactivate faculty
  await adminClient.patchJson(`/api/faculty/${createdFacId}`, { is_active: true });

  // -----------------------------------------------------------
  // 4. CLASS & SUBJECT MANAGEMENT TESTS
  // -----------------------------------------------------------
  console.log('\n--- 4. Testing Subject & Academic Class Management ---');
  // Admin creates class
  const testClassName = `CS-Cohort-${Date.now().toString().slice(-3)}`;
  res = await adminClient.postJson('/api/classes', {
    name: testClassName,
    department_id: 'dept-1',
    semester: 'Semester 6',
    academic_year: '2026-2027',
  });
  data = await res.json();
  assert(res.ok, 'Class creation failed');
  const createdClassId = data.class.id;
  console.log('✅ Academic Class created:', data.class.name);

  // Admin assigns course to faculty & class
  res = await adminClient.postJson('/api/subjects', {
    course_id: 'course-1',
    faculty_id: createdFacId,
    class_id: createdClassId,
  });
  data = await res.json();
  assert(res.ok, 'Subject assignment failed');
  console.log('✅ Course assigned to Faculty for Academic Class');

  // -----------------------------------------------------------
  // 5. LECTURE LIFECYCLE & DYNAMIC QR (REQUIREMENTS 6, 7 & 8)
  // -----------------------------------------------------------
  console.log('\n--- 5. Testing Lecture Lifecycle & Present/Pending/Absent Protocol ---');

  // Faculty launches a new lecture
  const lectureTopic = `Microservices Architecture & Consensus ${Date.now().toString().slice(-3)}`;
  res = await facultyClient.postJson('/api/lectures', {
    course_id: 'course-1',
    class_id: 'class-1',
    topic: lectureTopic,
    lecture_number: 9,
    session_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    duration_minutes: 60,
  });
  data = await res.json();
  assert(res.ok, 'Lecture start failed: ' + (data.error || ''));
  const lecture = data.lecture;
  console.log(`✅ Lecture #${lecture.lecture_number} started: "${lecture.topic}"`);
  console.log(`   Initial 15s Dynamic QR Token: ${lecture.qr_token}`);

  // Requirement 7: Rotate 15-second dynamic QR code
  res = await facultyClient.postJson(`/api/lectures/${lecture.id}/rotate-qr`, {});
  data = await res.json();
  assert(res.ok && data.success, 'QR code rotation failed');
  const rotatedToken = data.qr_token;
  console.log(`✅ 15-Second QR Token dynamically rotated: ${rotatedToken}`);

  // Requirement 8 Rule Check: WHILE LECTURE IS ACTIVE, ENROLLED STUDENTS MUST BE PENDING, NOT ABSENT!
  let roster = await facultyClient.getJson(`/api/lectures/${lecture.id}/roster`);
  assert(roster.stats.pending > 0, 'Active lecture must have pending students');
  assert.strictEqual(roster.stats.absent, 0, 'Requirement 8 Violation: Students must NOT be marked absent while lecture is active');
  console.log(`✅ Requirement 8 Verified: Active lecture has ${roster.stats.pending} PENDING students and 0 ABSENT students`);

  // Student performs 15-second Dynamic QR Scan Check-In
  res = await studentClient.postJson('/api/qr/scan', {
    qrToken: rotatedToken,
  });
  data = await res.json();
  assert(res.ok && data.success, 'Student QR scan check-in failed: ' + (data.message || ''));
  console.log('✅ Student scanned 15s dynamic QR code -> Marked PRESENT:', data.message);

  // Duplicate QR Scan prevention check
  res = await studentClient.postJson('/api/qr/scan', {
    qrToken: rotatedToken,
  });
  data = await res.json();
  assert(!res.ok && !data.success, 'Duplicate scan should be rejected');
  console.log('✅ Duplicate QR scan correctly rejected:', data.message);

  // Check roster: Student should now be Present, remaining students still Pending
  roster = await facultyClient.getJson(`/api/lectures/${lecture.id}/roster`);
  assert(roster.stats.present >= 1, 'At least 1 student must be present');
  console.log(`✅ Live Roster Update: Present: ${roster.stats.present}, Pending: ${roster.stats.pending}`);

  // Requirement 8: Faculty concludes the lecture -> Pending students transition to ABSENT automatically!
  res = await facultyClient.postJson(`/api/lectures/${lecture.id}/close`, {});
  data = await res.json();
  assert(res.ok, 'Lecture closure failed');
  console.log(`✅ Lecture Concluded: ${data.absentCount} pending students automatically converted to ABSENT`);

  // Verify closed lecture roster: Pending must now be 0, Absent must equal previous pending count
  roster = await facultyClient.getJson(`/api/lectures/${lecture.id}/roster`);
  assert.strictEqual(roster.stats.pending, 0, 'After lecture close, pending must be 0');
  assert(roster.stats.absent > 0, 'After lecture close, absent count must be greater than 0');
  console.log(`✅ Requirement 8 Post-Closure Verified: Present: ${roster.stats.present}, Absent: ${roster.stats.absent}, Pending: ${roster.stats.pending}`);

  // Requirement 8: Manual Attendance Correction with Mandatory Reason
  const absentStudent = roster.students.find((s) => s.status === 'absent');
  if (absentStudent) {
    // Attempt correction without reason -> should fail
    res = await facultyClient.postJson(`/api/lectures/${lecture.id}/roster`, {
      student_id: absentStudent.student.id,
      status: 'excused',
      reason: '', // Empty reason
    });
    assert(!res.ok, 'Manual correction without reason must be rejected');
    console.log('✅ Mandatory reason enforcement verified (empty reason rejected)');

    // Correct with valid reason
    res = await facultyClient.postJson(`/api/lectures/${lecture.id}/roster`, {
      student_id: absentStudent.student.id,
      status: 'excused',
      reason: 'Medical certificate approved by academic department',
    });
    data = await res.json();
    assert(res.ok, 'Manual correction failed');
    console.log(`✅ Manual attendance correction applied with audit log: ${data.message}`);
  }

  // -----------------------------------------------------------
  // 6. STUDENT PORTAL & STRICT DATA ISOLATION TESTS
  // -----------------------------------------------------------
  console.log('\n--- 6. Testing Student Portal & Data Isolation ---');
  // Student views personal attendance
  const studentPortalData = await studentClient.getJson('/api/students/me/attendance');
  assert(studentPortalData.student, 'Student profile must be returned');
  assert(studentPortalData.courses && studentPortalData.courses.length > 0, 'Courses must be returned');
  console.log(`✅ Student Personal Attendance Desk verified for ${studentPortalData.student.name}`);
  const firstCourse = studentPortalData.courses[0];
  console.log(`   Subject: ${firstCourse.course.code} - ${firstCourse.course.title}`);
  console.log(`   Attendance Rate: ${firstCourse.stats.percentage}% (Target: ${firstCourse.course.target_attendance_pct}%)`);
  console.log(`   75% Recovery Classes Needed: ${firstCourse.stats.classesNeededFor75}`);

  // Data isolation: Student querying `/api/students` should ONLY receive their own record
  const studentListRestricted = await studentClient.getJson('/api/students');
  assert.strictEqual(studentListRestricted.students.length, 1, 'Student must only see their own record');
  console.log('✅ Strict Student Data Isolation verified: Student cannot view records of other students');

  // -----------------------------------------------------------
  // 7. INSTITUTIONAL ADMIN REPORTS
  // -----------------------------------------------------------
  console.log('\n--- 7. Testing Institutional Admin Reports ---');
  const reportData = await adminClient.getJson('/api/admin/reports');
  assert(reportData.counts, 'Institutional counts must be returned');
  console.log('✅ Admin Institutional Report Summary:');
  console.log(`   Total Students: ${reportData.counts.totalStudents} (${reportData.counts.activeStudents} active)`);
  console.log(`   Total Faculty: ${reportData.counts.totalFaculty} (${reportData.counts.activeFaculty} active)`);
  console.log(`   Total Subjects: ${reportData.counts.totalSubjects}`);
  console.log(`   Total Classes: ${reportData.counts.totalClasses}`);
  console.log(`   Total Lectures: ${reportData.counts.totalLectures} (${reportData.counts.activeLectures} active)`);
  console.log(`   Overall Institutional Attendance: ${reportData.counts.overallAttendancePct}%`);
  console.log(`   Compliance Distribution: Good: ${reportData.attendanceDistribution.good}, Warning: ${reportData.attendanceDistribution.warning}, Critical: ${reportData.attendanceDistribution.critical}`);

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL.');
}

runTests().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
