import { NextResponse } from 'next/server';
import { getStudentsWithStats, getSessionsByCourse, getAttendanceForSession, getCourseById } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId') || 'course-1';
  const course = await getCourseById(courseId);
  const students = await getStudentsWithStats(courseId);
  const sessions = await getSessionsByCourse(courseId);

  // Build CSV headers: Roll Number, Student Name, Email, [Date Session 1], [Date Session 2]..., Total Present, Percentage, Risk Status
  let csv = `Course Code,${course?.code || 'N/A'},Course Title,"${course?.title || 'N/A'}"\n`;
  csv += `Generated At,${new Date().toISOString()}\n\n`;

  const sessionCols = sessions.map((s) => `"${s.session_date} (${s.title.replace(/"/g, '""')})"`).join(',');
  csv += `Roll Number,Student Name,Institutional Email,Department,${sessionCols},Present,Absent,Late,Excused,Attendance Rate,Compliance Status\n`;

  for (const stu of students) {
    const sessionStatuses = await Promise.all(
      sessions.map(async (sess) => {
        const records = await getAttendanceForSession(sess.id);
        const record = records.find((r) => r.student_id === stu.id);
        return record ? record.status.toUpperCase() : 'ABSENT';
      })
    );

    const compliance = (stu.stats?.percentage ?? 0) >= 75 ? 'ELIGIBLE' : 'SHORTAGE ALERT';
    const row = [
      `"${stu.roll_number}"`,
      `"${stu.name}"`,
      `"${stu.email}"`,
      `"${stu.department_id}"`,
      ...sessionStatuses.map((st) => `"${st}"`),
      stu.stats?.present ?? 0,
      stu.stats?.absent ?? 0,
      stu.stats?.late ?? 0,
      stu.stats?.excused ?? 0,
      `"${stu.stats?.percentage ?? 0}%"`,
      `"${compliance}"`,
    ];
    csv += row.join(',') + '\n';
  }

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance-report-${course?.code || 'export'}.csv"`,
    },
  });
}

