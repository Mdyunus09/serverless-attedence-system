'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import LiveRollCall from '@/components/LiveRollCall';
import QRTerminal from '@/components/QRTerminal';
import StudentAnalytics from '@/components/StudentAnalytics';
import LeaveDesk from '@/components/LeaveDesk';
import AuditDesk from '@/components/AuditDesk';
import NeonModal from '@/components/NeonModal';
import NewSessionModal from '@/components/NewSessionModal';
import { Course, Session, DatabaseStatus } from '@/lib/types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'rollcall' | 'analytics' | 'leave' | 'audit'>('rollcall');

  // Modals
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isNeonModalOpen, setIsNeonModalOpen] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);

  // Fetch initial courses & db status
  const fetchInitialData = useCallback(async () => {
    try {
      const [coursesRes, dbRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/db'),
      ]);
      const coursesData = await coursesRes.json();
      const dbData = await dbRes.json();

      if (coursesData.courses?.length > 0) {
        setCourses(coursesData.courses);
        setSelectedCourse(coursesData.courses[0]);
      }
      setDbStatus(dbData);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch sessions when selected course changes
  const fetchSessions = useCallback(async () => {
    if (!selectedCourse) return;
    try {
      const res = await fetch(`/api/sessions?courseId=${selectedCourse.id}`);
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
        if (data.sessions.length > 0) {
          // Select open session or first one
          const openSess = data.sessions.find((s: Session) => !s.is_closed) || data.sessions[0];
          setSelectedSession(openSess);
        } else {
          setSelectedSession(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedCourse]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="min-h-screen bg-[#08090b] text-[#f3efe6] flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        courses={courses}
        selectedCourse={selectedCourse}
        onSelectCourse={(course) => setSelectedCourse(course)}
        dbStatus={dbStatus}
        onOpenNeonModal={() => setIsNeonModalOpen(true)}
        onNewSession={() => setIsNewSessionModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Course Banner */}
        {selectedCourse && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#101217] via-[#141720] to-[#0e1014] border border-white/10 shadow-card relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#d9ad3c]/10 via-transparent to-transparent pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#d9ad3c]/20 text-[#e4c668] border border-[#d9ad3c]/30">
                    {selectedCourse.code}
                  </span>
                  <span className="text-xs font-mono text-[#9e988f]">
                    {selectedCourse.semester}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {selectedCourse.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#9e988f] pt-1 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#e4c668]" />
                    {selectedCourse.instructor_name}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2dd4bf]" />
                    {selectedCourse.room}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/70" />
                    {selectedCourse.schedule_days.join(', ')} ({selectedCourse.schedule_time})
                  </span>
                </div>
              </div>

              {/* Course Meta Stats */}
              <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5 text-xs font-mono">
                <div className="text-center px-3 border-r border-white/10">
                  <span className="text-[10px] uppercase text-[#9e988f] block">Enrolled</span>
                  <span className="text-base font-bold text-white tabular-nums">{selectedCourse.enrolled_count || 14}</span>
                </div>
                <div className="text-center px-3 border-r border-white/10">
                  <span className="text-[10px] uppercase text-[#9e988f] block">Eligibility Req</span>
                  <span className="text-base font-bold text-[#e4c668] tabular-nums">{selectedCourse.target_attendance_pct}%</span>
                </div>
                <div className="text-center px-3">
                  <span className="text-[10px] uppercase text-[#9e988f] block">Cloud DB</span>
                  <span className="text-base font-bold text-[#2dd4bf]">
                    {dbStatus?.connected ? 'Neon Pool' : 'Local Fallback'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabbed Navigation */}
        <div className="border-b border-white/10 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-2 overflow-x-auto pb-px">
            <button
              onClick={() => setActiveTab('rollcall')}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'rollcall'
                  ? 'border-[#d9ad3c] text-[#e4c668] font-semibold'
                  : 'border-transparent text-[#9e988f] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Live Attendance Terminal
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'border-[#d9ad3c] text-[#e4c668] font-semibold'
                  : 'border-transparent text-[#9e988f] hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Shortage &amp; Compliance Watchlist
            </button>

            <button
              onClick={() => setActiveTab('leave')}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'leave'
                  ? 'border-[#d9ad3c] text-[#e4c668] font-semibold'
                  : 'border-transparent text-[#9e988f] hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Leave Applications Desk
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'border-[#d9ad3c] text-[#e4c668] font-semibold'
                  : 'border-transparent text-[#9e988f] hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Department Audit &amp; Reports
            </button>
          </nav>

          {/* Session Switcher Pills (when in Roll Call tab) */}
          {activeTab === 'rollcall' && sessions.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono">
              <span className="text-[#6b6660] text-[11px] mr-1">Session:</span>
              {sessions.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    selectedSession?.id === s.id
                      ? 'bg-white/10 text-white border border-white/20 font-semibold'
                      : 'text-[#9e988f] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s.session_date.slice(5)} {!s.is_closed && '●'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Panels */}
        {activeTab === 'rollcall' && (
          <div>
            {selectedSession ? (
              <LiveRollCall
                session={selectedSession}
                onSessionUpdated={fetchSessions}
                onOpenQR={() => setIsQRModalOpen(true)}
              />
            ) : (
              <div className="p-12 text-center rounded-2xl bg-[#0e1014] border border-white/5 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#d9ad3c]/10 text-[#d9ad3c] flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">No active attendance session</h3>
                  <p className="text-xs text-[#9e988f] mt-1">
                    Start a new lecture or lab session to begin taking live roll call.
                  </p>
                </div>
                {selectedCourse && (
                  <button
                    onClick={() => setIsNewSessionModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-xs transition-colors"
                  >
                    Start Today&apos;s Session
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && selectedCourse && (
          <StudentAnalytics course={selectedCourse} />
        )}

        {activeTab === 'leave' && selectedCourse && (
          <LeaveDesk course={selectedCourse} onLeaveUpdated={fetchSessions} />
        )}

        {activeTab === 'audit' && selectedCourse && (
          <AuditDesk course={selectedCourse} />
        )}
      </main>

      {/* QR Terminal Projector Modal */}
      {selectedSession && (
        <QRTerminal
          session={selectedSession}
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          onScanSuccess={fetchSessions}
        />
      )}

      {/* Neon Cloud Database Diagnostics Modal */}
      <NeonModal
        isOpen={isNeonModalOpen}
        onClose={() => setIsNeonModalOpen(false)}
        onStatusChange={fetchInitialData}
      />

      {/* New Session Modal */}
      {selectedCourse && (
        <NewSessionModal
          course={selectedCourse}
          isOpen={isNewSessionModalOpen}
          onClose={() => setIsNewSessionModalOpen(false)}
          onCreated={(newSess) => {
            fetchSessions();
            setSelectedSession(newSess);
          }}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-4 px-4 text-center text-xs font-mono text-[#6b6660]">
        Cadence Attendance Intelligence • Connected to Neon Cloud PostgreSQL (ap-southeast-1) • Impeccable Design Standard
      </footer>
    </div>
  );
}

