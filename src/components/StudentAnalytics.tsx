'use client';

import React, { useState, useEffect } from 'react';
import { Student, Course } from '@/lib/types';
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Send,
  User,
  Search,
  Filter,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

interface Props {
  course: Course;
}

export default function StudentAnalytics({ course }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'good'>('all');
  const [search, setSearch] = useState('');
  const [sentNoticeIds, setSentNoticeIds] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/students?courseId=${course.id}`);
        const data = await res.json();
        if (data.students) {
          setStudents(data.students);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [course.id]);

  const handleSendNotice = (studentId: string, studentName: string) => {
    setSentNoticeIds((prev) => [...prev, studentId]);
    // Dispatch notice
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || s.stats?.status === filter;
    return matchesSearch && matchesFilter;
  });

  const criticalCount = students.filter((s) => s.stats?.status === 'critical').length;
  const warningCount = students.filter((s) => s.stats?.status === 'warning').length;
  const goodCount = students.filter((s) => s.stats?.status === 'good').length;
  const avgAttendance =
    students.length > 0
      ? Math.round(
          students.reduce((acc, curr) => acc + (curr.stats?.percentage ?? 0), 0) / students.length
        )
      : 0;

  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#0e1014] border border-white/5 space-y-1">
          <span className="text-[11px] font-mono uppercase text-[#9e988f]">Enrolled Roster</span>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">{students.length}</div>
          <span className="text-xs text-[#9e988f]">{course.code} • Section A</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1014] border border-white/5 space-y-1">
          <span className="text-[11px] font-mono uppercase text-[#9e988f]">Cohort Average</span>
          <div className="text-2xl font-bold font-mono text-[#2dd4bf] tabular-nums">{avgAttendance}%</div>
          <span className="text-xs text-[#9e988f]">Mandatory Cutoff: 75%</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1014] border border-white/5 space-y-1">
          <span className="text-[11px] font-mono uppercase text-[#9e988f]">Borderline Students</span>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">{warningCount}</div>
          <span className="text-xs text-[#9e988f]">Between 75% - 80%</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1014] border border-white/5 space-y-1">
          <span className="text-[11px] font-mono uppercase text-[#9e988f]">Shortage / At Risk</span>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">{criticalCount}</div>
          <span className="text-xs text-rose-400/80">Exam debarment risk (&lt;75%)</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#9e988f] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or roll number..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0e1014] border border-white/10 rounded-lg text-xs text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
            />
          </div>

          <div className="flex items-center bg-[#0e1014] border border-white/10 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filter === 'all' ? 'bg-white/10 text-white font-medium' : 'text-[#9e988f] hover:text-white'
              }`}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filter === 'critical' ? 'bg-rose-500/20 text-rose-400 font-medium' : 'text-[#9e988f] hover:text-white'
              }`}
            >
              At Risk ({criticalCount})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filter === 'warning' ? 'bg-amber-500/20 text-amber-400 font-medium' : 'text-[#9e988f] hover:text-white'
              }`}
            >
              Borderline ({warningCount})
            </button>
            <button
              onClick={() => setFilter('good')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filter === 'good' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-[#9e988f] hover:text-white'
              }`}
            >
              Eligible ({goodCount})
            </button>
          </div>
        </div>

        <a
          href={`/api/export?courseId=${course.id}`}
          download
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#2dd4bf]" />
          Export Attendance Master CSV
        </a>
      </div>

      {/* Student Cards Grid / Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0d10]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-[#101217] text-[#9e988f] font-mono text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Student Details</th>
              <th className="py-2.5 px-3 font-mono">Roll Number</th>
              <th className="py-2.5 px-3">Sessions Breakdown</th>
              <th className="py-2.5 px-3">Attendance Rate</th>
              <th className="py-2.5 px-3">Compliance &amp; Recovery Plan</th>
              <th className="py-2.5 px-3 text-right">Administrative Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#9e988f]">
                  No students found matching current criteria.
                </td>
              </tr>
            ) : (
              filteredStudents.map((stu) => {
                const stats = stu.stats;
                const isCritical = stats?.status === 'critical';
                const isWarning = stats?.status === 'warning';
                const hasSent = sentNoticeIds.includes(stu.id);

                return (
                  <tr key={stu.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#181a20] border border-white/10 flex items-center justify-center font-medium text-xs text-[#e4c668]">
                          {stu.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white">{stu.name}</div>
                          <div className="text-[11px] text-[#9e988f]">{stu.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[#e4c668]">
                      {stu.roll_number}
                    </td>

                    <td className="py-3 px-3 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">P:{stats?.present}</span>
                        <span className="text-[#9e988f]">•</span>
                        <span className="text-amber-400">L:{stats?.late}</span>
                        <span className="text-[#9e988f]">•</span>
                        <span className="text-rose-400">A:{stats?.absent}</span>
                        <span className="text-[#9e988f]">•</span>
                        <span className="text-sky-400">E:{stats?.excused}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-sm tabular-nums ${
                            isCritical
                              ? 'text-rose-400'
                              : isWarning
                              ? 'text-amber-400'
                              : 'text-[#2dd4bf]'
                          }`}
                        >
                          {stats?.percentage}%
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full ${
                              isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-[#2dd4bf]'
                            }`}
                            style={{ width: `${stats?.percentage ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-xs">
                      {isCritical ? (
                        <div className="flex items-center gap-1.5 text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Needs <strong>{stats?.classesNeededFor75}</strong> consecutive classes for 75%
                          </span>
                        </div>
                      ) : isWarning ? (
                        <div className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Borderline — No further absences permitted</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Examination Eligible</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {isCritical ? (
                        <button
                          onClick={() => handleSendNotice(stu.id, stu.name)}
                          disabled={hasSent}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                            hasSent
                              ? 'bg-white/5 text-[#9e988f] cursor-default'
                              : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {hasSent ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              Notice Issued
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              Issue Shortage Notice
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-[#6b6660]">In Good Standing</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

