'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  GraduationCap,
  Briefcase,
  BookOpen,
  Calendar,
  Sparkles,
  TrendingUp,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export default function AdminReportsDesk() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportCSV = () => {
    window.location.href = '/api/export';
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-[#9e988f]">
        <div className="inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#d9ad3c]" />
          Aggregating institutional attendance metrics...
        </div>
      </div>
    );
  }

  const counts = report?.counts || {};
  const subjectStats = report?.subjectStats || [];
  const facultyStats = report?.facultyStats || [];
  const dist = report?.attendanceDistribution || { good: 0, warning: 0, critical: 0 };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#101217] via-[#141720] to-[#0e1014] border border-white/10 shadow-card flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#d9ad3c]/20 text-[#e4c668] border border-[#d9ad3c]/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#d9ad3c]" /> Institutional Analytics
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#d9ad3c]" /> Comprehensive Attendance &amp; Operational Reports
          </h2>
          <p className="text-xs text-[#9e988f]">
            Cross-department attendance compliance, subject performance indices, and faculty lecture distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d9ad3c] to-[#e4c668] hover:from-[#e4c668] hover:to-[#f0d886] text-black font-semibold text-xs transition-all shadow-lg shadow-[#d9ad3c]/20 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Master CSV
          </button>
        </div>
      </div>

      {/* Institutional Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 space-y-1 shadow-card">
          <div className="flex items-center justify-between text-[#9e988f] text-[11px] font-mono">
            <span>STUDENTS</span>
            <GraduationCap className="w-3.5 h-3.5 text-[#2dd4bf]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{counts.totalStudents ?? 0}</div>
          <p className="text-[10px] text-emerald-400 font-mono">{counts.activeStudents ?? 0} Active</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 space-y-1 shadow-card">
          <div className="flex items-center justify-between text-[#9e988f] text-[11px] font-mono">
            <span>FACULTY</span>
            <Briefcase className="w-3.5 h-3.5 text-[#e4c668]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{counts.totalFaculty ?? 0}</div>
          <p className="text-[10px] text-emerald-400 font-mono">{counts.activeFaculty ?? 0} Active</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 space-y-1 shadow-card">
          <div className="flex items-center justify-between text-[#9e988f] text-[11px] font-mono">
            <span>SUBJECTS</span>
            <BookOpen className="w-3.5 h-3.5 text-[#d9ad3c]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{counts.totalSubjects ?? 0}</div>
          <p className="text-[10px] text-[#9e988f] font-mono">Curriculum items</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 space-y-1 shadow-card">
          <div className="flex items-center justify-between text-[#9e988f] text-[11px] font-mono">
            <span>CLASSES</span>
            <Layers className="w-3.5 h-3.5 text-[#2dd4bf]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{counts.totalClasses ?? 0}</div>
          <p className="text-[10px] text-[#9e988f] font-mono">Active cohorts</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 space-y-1 shadow-card">
          <div className="flex items-center justify-between text-[#9e988f] text-[11px] font-mono">
            <span>LECTURES</span>
            <Calendar className="w-3.5 h-3.5 text-[#e4c668]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{counts.totalLectures ?? 0}</div>
          <p className="text-[10px] text-emerald-400 font-mono">{counts.activeLectures ?? 0} Live</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 space-y-1 shadow-card">
          <div className="flex items-center justify-between text-[#9e988f] text-[11px] font-mono">
            <span>OVERALL ATT%</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#2dd4bf]" />
          </div>
          <div className="text-2xl font-bold text-[#2dd4bf] font-mono">{counts.overallAttendancePct ?? 88}%</div>
          <p className="text-[10px] text-[#9e988f] font-mono">Institution rate</p>
        </div>
      </div>

      {/* Compliance Distribution Bar */}
      <div className="p-5 rounded-2xl bg-[#0f1115] border border-white/10 space-y-3 shadow-card">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#d9ad3c]" />
            Student Attendance Compliance Breakdown (Mandatory 75% Requirement)
          </span>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-emerald-400">≥85% Good: {dist.good}</span>
            <span className="text-amber-400">75-84% Warning: {dist.warning}</span>
            <span className="text-red-400">&lt;75% Critical: {dist.critical}</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-3 rounded-full bg-black/60 overflow-hidden flex">
          <div
            style={{ width: `${(dist.good / (counts.totalStudents || 1)) * 100}%` }}
            className="bg-emerald-500 h-full transition-all"
            title={`Good: ${dist.good}`}
          />
          <div
            style={{ width: `${(dist.warning / (counts.totalStudents || 1)) * 100}%` }}
            className="bg-amber-500 h-full transition-all"
            title={`Warning: ${dist.warning}`}
          />
          <div
            style={{ width: `${(dist.critical / (counts.totalStudents || 1)) * 100}%` }}
            className="bg-red-500 h-full transition-all"
            title={`Critical: ${dist.critical}`}
          />
        </div>
      </div>

      {/* Detailed Tables: Subject Performance & Faculty Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#d9ad3c]" /> Subject Attendance Performance
            </h3>
            <span className="text-[11px] font-mono text-[#9e988f]">{subjectStats.length} Subjects</span>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {subjectStats.map((sub: any) => (
              <div
                key={sub.id}
                className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-[#d9ad3c]/20 text-[#e4c668]">
                      {sub.code}
                    </span>
                    <span className="font-semibold text-white">{sub.title}</span>
                  </div>
                  <span className="text-[11px] text-[#9e988f] font-mono mt-1 block">
                    Instructor: {sub.instructor_name}
                  </span>
                </div>

                <div className="text-right font-mono">
                  <span
                    className={`text-sm font-bold block ${
                      sub.avgAttendancePct >= 75 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {sub.avgAttendancePct}%
                  </span>
                  <span className="text-[10px] text-[#6b6660]">{sub.totalSessions} Sessions</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty Lecture Activity */}
        <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#2dd4bf]" /> Faculty Lecture Activity
            </h3>
            <span className="text-[11px] font-mono text-[#9e988f]">{facultyStats.length} Faculty Members</span>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {facultyStats.map((fac: any) => (
              <div
                key={fac.id}
                className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{fac.name}</span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-white/5 text-[#9e988f]">
                      {fac.employee_id}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#2dd4bf] block mt-1">{fac.department}</span>
                </div>

                <div className="text-right font-mono">
                  <span className="text-sm font-bold text-white block">{fac.lecturesConducted}</span>
                  <span className="text-[10px] text-[#6b6660]">Lectures Held</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

