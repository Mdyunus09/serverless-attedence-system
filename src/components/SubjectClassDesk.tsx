'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Course, AcademicClass, Faculty, Department, SubjectAssignment } from '@/lib/types';
import {
  BookOpen,
  GraduationCap,
  Plus,
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Calendar,
  Sparkles,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';

interface Props {
  departments: Department[];
  courses: Course[];
  classes: AcademicClass[];
  faculty: Faculty[];
  onDataChanged?: () => void;
}

export default function SubjectClassDesk({ departments, courses, classes: initialClasses, faculty, onDataChanged }: Props) {
  const [classList, setClassList] = useState<AcademicClass[]>(initialClasses);
  const [courseList, setCourseList] = useState<Course[]>(courses);
  const [deptList, setDeptList] = useState<Department[]>(departments);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Class Modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [classDeptId, setClassDeptId] = useState(departments[0]?.id || 'dept-1');
  const [classSemester, setClassSemester] = useState('Fall 2026');
  const [classYear, setClassYear] = useState('2026-2027');
  const [classSubmitting, setClassSubmitting] = useState(false);

  // Subject Modal
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDeptId, setCourseDeptId] = useState(departments[0]?.id || 'dept-1');
  const [courseInstructorName, setCourseInstructorName] = useState(faculty[0]?.name || 'Dr. Aris Vandenberg');
  const [courseInstructorEmail, setCourseInstructorEmail] = useState(faculty[0]?.email || 'faculty@cadence.edu');
  const [courseRoom, setCourseRoom] = useState('Hall A');
  const [courseSemester, setCourseSemester] = useState('Fall 2026');
  const [courseSubmitting, setCourseSubmitting] = useState(false);

  // Department Modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptFacultyHead, setDeptFacultyHead] = useState('');
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignCourseId, setAssignCourseId] = useState(courses[0]?.id || '');
  const [assignFacultyId, setAssignFacultyId] = useState(faculty[0]?.id || '');
  const [assignClassId, setAssignClassId] = useState(initialClasses[0]?.id || '');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const fetchAssignmentsAndClasses = useCallback(async () => {
    try {
      setLoading(true);
      const [assignRes, classRes, deptRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/classes'),
        fetch('/api/departments'),
      ]);
      const assignData = await assignRes.json();
      const classData = await classRes.json();
      const deptData = await deptRes.json();

      if (assignData.assignments) {
        setAssignments(assignData.assignments);
      }
      if (assignData.courses) {
        setCourseList(assignData.courses);
      }
      if (classData.classes) {
        setClassList(classData.classes);
      }
      if (deptData.departments) {
        setDeptList(deptData.departments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignmentsAndClasses();
  }, [fetchAssignmentsAndClasses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourseSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: courseCode.trim().toUpperCase(),
          title: courseTitle.trim(),
          department_id: courseDeptId,
          instructor_name: courseInstructorName.trim(),
          instructor_email: courseInstructorEmail.trim().toLowerCase(),
          room: courseRoom.trim(),
          semester: courseSemester.trim(),
          target_attendance_pct: 75,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create subject.');
      }

      setFeedback({ type: 'success', message: `Subject "${courseTitle}" (${courseCode.toUpperCase()}) created successfully.` });
      setIsCourseModalOpen(false);
      setCourseCode('');
      setCourseTitle('');
      await fetchAssignmentsAndClasses();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setCourseSubmitting(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: deptCode.trim().toUpperCase(),
          name: deptName.trim(),
          faculty_head: deptFacultyHead.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create department.');
      }

      setFeedback({ type: 'success', message: `Department "${deptName}" (${deptCode.toUpperCase()}) created successfully.` });
      setIsDeptModalOpen(false);
      setDeptCode('');
      setDeptName('');
      setDeptFacultyHead('');
      await fetchAssignmentsAndClasses();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: className.trim(),
          department_id: classDeptId,
          semester: classSemester.trim(),
          academic_year: classYear.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create academic class.');
      }

      setFeedback({ type: 'success', message: `Class "${className}" created successfully.` });
      setIsClassModalOpen(false);
      setClassName('');
      await fetchAssignmentsAndClasses();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setClassSubmitting(false);
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: assignCourseId,
          faculty_id: assignFacultyId,
          class_id: assignClassId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assign subject.');
      }

      setFeedback({ type: 'success', message: 'Subject assigned to faculty and class successfully.' });
      setIsAssignModalOpen(false);
      await fetchAssignmentsAndClasses();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this faculty subject assignment?')) return;
    try {
      const res = await fetch(`/api/subjects?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove assignment.');
      setFeedback({ type: 'success', message: 'Subject assignment removed.' });
      await fetchAssignmentsAndClasses();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#101217] via-[#141720] to-[#0e1014] border border-white/10 shadow-card flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#2dd4bf]" /> Academic Curriculum Desk
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#d9ad3c]" /> Subject &amp; Class Management
          </h2>
          <p className="text-xs text-[#9e988f]">
            Configure academic classes, manage institutional subjects, and allocate faculty instructors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsDeptModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#e2ded7] font-semibold text-xs transition-all flex items-center gap-1.5"
          >
            <Building className="w-3.5 h-3.5 text-[#e4c668]" />
            Add Department
          </button>
          <button
            onClick={() => setIsCourseModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#e2ded7] font-semibold text-xs transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#d9ad3c]" />
            Add Subject
          </button>
          <button
            onClick={() => setIsClassModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs transition-all flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#2dd4bf]" />
            Add Academic Class
          </button>
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d9ad3c] to-[#e4c668] hover:from-[#e4c668] hover:to-[#f0d886] text-black font-semibold text-xs transition-all shadow-lg shadow-[#d9ad3c]/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Assign Subject to Faculty
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Classes & Subject Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Classes Panel */}
        <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#2dd4bf]" />
              <h3 className="text-sm font-bold text-white">Registered Academic Classes</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/5 text-[#9e988f]">
              {classList.length} Classes
            </span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {classList.map((cls) => {
              const dept = departments.find((d) => d.id === cls.department_id);
              return (
                <div
                  key={cls.id}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-xs">{cls.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/20">
                        {cls.semester}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#9e988f]">
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-[#e4c668]" /> {dept?.name || 'Computer Science'}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-white/70">{cls.academic_year}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase text-[#6b6660] block font-mono">Enrolled</span>
                    <span className="text-sm font-bold text-white font-mono">{cls.student_count || 14}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subject-Faculty Allocations Panel */}
        <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#d9ad3c]" />
              <h3 className="text-sm font-bold text-white">Teaching Allocations &amp; Subjects</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/5 text-[#9e988f]">
              {assignments.length} Assignments
            </span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {assignments.length === 0 ? (
              <p className="text-center py-10 text-xs text-[#6b6660]">No subjects currently assigned.</p>
            ) : (
              assignments.map((a) => {
                const c = courseList.find((course) => course.id === a.course_id) || a.course;
                const f = faculty.find((fac) => fac.id === a.faculty_id) || a.faculty;
                const cls = classList.find((cl) => cl.id === a.class_id) || a.class;

                return (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#d9ad3c]/20 text-[#e4c668] border border-[#d9ad3c]/30">
                          {c?.code || 'CS'}
                        </span>
                        <span className="font-semibold text-white text-xs">{c?.title || 'Subject'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#9e988f]">
                        <span className="text-white/90">Instructor: {f?.name || 'Faculty'}</span>
                        <span>•</span>
                        <span className="text-[#2dd4bf] font-mono">{cls?.name || 'Class'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveAssignment(a.id)}
                      className="p-1.5 rounded-lg text-[#9e988f] hover:text-red-400 hover:bg-white/5 transition-colors"
                      title="Remove Assignment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Institutional Subjects Catalog Panel */}
      <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#d9ad3c]" />
            <h3 className="text-sm font-bold text-white">Registered Subjects &amp; Curriculum</h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/5 text-[#9e988f]">
            {courseList.length} Subjects
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {courseList.map((c) => {
            const dept = deptList.find((d) => d.id === c.department_id);
            return (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#d9ad3c]/20 text-[#e4c668] border border-[#d9ad3c]/30">
                    {c.code}
                  </span>
                  <span className="text-[10px] font-mono text-[#2dd4bf] bg-[#2dd4bf]/10 px-2 py-0.5 rounded border border-[#2dd4bf]/20">
                    Target: {c.target_attendance_pct || 75}%
                  </span>
                </div>
                <h4 className="font-semibold text-white text-xs">{c.title}</h4>
                <div className="text-[11px] text-[#9e988f] space-y-0.5 font-mono">
                  <div>Instructor: <span className="text-white/80">{c.instructor_name}</span></div>
                  <div className="flex items-center justify-between text-[10px] text-[#6b6660] pt-1">
                    <span>{dept?.name || 'Computer Science'}</span>
                    <span>{c.room || 'Hall A'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf]">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Academic Class</h3>
                  <p className="text-xs text-[#9e988f]">New student section and cohort</p>
                </div>
              </div>
              <button onClick={() => setIsClassModalOpen(false)} className="text-[#9e988f] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Class Name / Section *</label>
                <input
                  type="text"
                  required
                  placeholder="CS-Year3-SecB"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#2dd4bf]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Department *</label>
                <select
                  value={classDeptId}
                  onChange={(e) => setClassDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#2dd4bf]"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Semester *</label>
                  <input
                    type="text"
                    required
                    placeholder="Fall 2026"
                    value={classSemester}
                    onChange={(e) => setClassSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#2dd4bf]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Academic Year *</label>
                  <input
                    type="text"
                    required
                    placeholder="2026-2027"
                    value={classYear}
                    onChange={(e) => setClassYear(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#2dd4bf]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={classSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#2dd4bf] hover:bg-[#34e2cb] text-black font-semibold transition-all shadow-md"
                >
                  {classSubmitting ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Subject Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Assign Subject to Faculty</h3>
                  <p className="text-xs text-[#9e988f]">Map subject, instructor, and student class</p>
                </div>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-[#9e988f] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubject} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Subject / Course *</label>
                <select
                  value={assignCourseId}
                  onChange={(e) => setAssignCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                >
                  {courseList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Faculty Instructor *</label>
                <select
                  value={assignFacultyId}
                  onChange={(e) => setAssignFacultyId(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                >
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Target Academic Class *</label>
                <select
                  value={assignClassId}
                  onChange={(e) => setAssignClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                >
                  {classList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold transition-all shadow-md"
                >
                  {assignSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add New Subject</h3>
                  <p className="text-xs text-[#9e988f]">Register a new course in the academic catalog</p>
                </div>
              </div>
              <button onClick={() => setIsCourseModalOpen(false)} className="text-[#9e988f] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Subject Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="CS-302"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[#9e988f] block font-medium">Subject Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Operating Systems & Architecture"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Department *</label>
                  <select
                    value={courseDeptId}
                    onChange={(e) => setCourseDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  >
                    {deptList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Lecture Room</label>
                  <input
                    type="text"
                    placeholder="Hall 301 / Lab 4"
                    value={courseRoom}
                    onChange={(e) => setCourseRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Primary Instructor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Alan Turing"
                    value={courseInstructorName}
                    onChange={(e) => setCourseInstructorName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Instructor Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="instructor@cadence.edu"
                    value={courseInstructorEmail}
                    onChange={(e) => setCourseInstructorEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Semester</label>
                  <input
                    type="text"
                    placeholder="Fall 2026"
                    value={courseSemester}
                    onChange={(e) => setCourseSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Target Attendance %</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={75}
                    readOnly
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-[#2dd4bf] font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={courseSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold transition-all shadow-md"
                >
                  {courseSubmitting ? 'Registering...' : 'Register Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e4c668]/10 border border-[#e4c668]/30 flex items-center justify-center text-[#e4c668]">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add New Department</h3>
                  <p className="text-xs text-[#9e988f]">Establish academic department &amp; leadership</p>
                </div>
              </div>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-[#9e988f] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ME, EE, IT"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono placeholder-[#6b6660] focus:outline-none focus:border-[#e4c668]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Mechanical & Aerospace Engineering"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#e4c668]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Faculty Head / Chairperson *</label>
                <input
                  type="text"
                  required
                  placeholder="Prof. Robert Sterling"
                  value={deptFacultyHead}
                  onChange={(e) => setDeptFacultyHead(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#e4c668]"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold transition-all shadow-md"
                >
                  {deptSubmitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

