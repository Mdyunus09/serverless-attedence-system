'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Course, AcademicClass, Session, AttendanceStatus } from '@/lib/types';
import { AuthUser } from '@/lib/auth/types';
import {
  Play,
  StopCircle,
  QrCode,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw,
  Edit3,
  FileSpreadsheet,
  X,
  History,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import QRTerminal from '@/components/QRTerminal';

interface Props {
  currentUser: AuthUser | null;
  courses: Course[];
  classes: AcademicClass[];
}

export default function LectureCockpit({ currentUser, courses, classes }: Props) {
  const [lectures, setLectures] = useState<Session[]>([]);
  const [activeLecture, setActiveLecture] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterData, setRosterData] = useState<{
    students: Array<{
      student: any;
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
  } | null>(null);

  // New Lecture Form State
  const [isNewLectureOpen, setIsNewLectureOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || 'class-1');
  const [topic, setTopic] = useState('');
  const [lectureNumber, setLectureNumber] = useState(1);
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState('09:00');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [creatingLecture, setCreatingLecture] = useState(false);

  // QR Modal State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Correction Modal State
  const [correctingStudent, setCorrectingStudent] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctingLoading, setCorrectingLoading] = useState(false);

  // Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLectures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/lectures');
      const data = await res.json();
      if (data.lectures) {
        setLectures(data.lectures);
        // Find active lecture if any
        const active = data.lectures.find((l: Session) => !l.is_closed && l.status !== 'closed');
        if (active) {
          setActiveLecture(active);
        } else if (data.lectures.length > 0) {
          setActiveLecture(data.lectures[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  // Fetch roster when activeLecture changes or polls
  const fetchRoster = useCallback(async (lectureId: string) => {
    try {
      setRosterLoading(true);
      const res = await fetch(`/api/lectures/${lectureId}/roster`);
      const data = await res.json();
      if (data.students) {
        setRosterData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRosterLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeLecture) {
      fetchRoster(activeLecture.id);
    }
  }, [activeLecture, fetchRoster]);

  // Auto-poll roster every 4 seconds while active lecture is open to show real-time student check-ins
  useEffect(() => {
    if (!activeLecture || activeLecture.is_closed || activeLecture.status === 'closed') return;
    const interval = setInterval(() => {
      fetchRoster(activeLecture.id);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeLecture, fetchRoster]);

  const handleStartLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setCreatingLecture(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/lectures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: selectedCourseId,
          class_id: selectedClassId,
          topic: topic.trim(),
          lecture_number: lectureNumber,
          session_date: sessionDate,
          start_time: startTime,
          duration_minutes: duration,
          session_type: 'lecture',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start lecture.');

      setFeedback({
        type: 'success',
        message: `Lecture #${lectureNumber} "${topic}" launched! Dynamic 15-second QR rotation active.`,
      });
      setIsNewLectureOpen(false);
      setTopic('');
      setLectureNumber((prev) => prev + 1);
      await fetchLectures();
      setActiveLecture(data.lecture);
      setIsQRModalOpen(true);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setCreatingLecture(false);
    }
  };

  const handleCloseLecture = async () => {
    if (!activeLecture) return;
    if (
      !confirm(
        `Are you sure you want to conclude Lecture #${activeLecture.lecture_number || 1}? Any remaining Pending students will be automatically marked Absent according to institutional policy.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/lectures/${activeLecture.id}/close`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close lecture.');

      setFeedback({
        type: 'success',
        message: data.message || 'Lecture concluded. Attendance roll successfully locked.',
      });
      await fetchLectures();
      if (activeLecture) fetchRoster(activeLecture.id);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleManualCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLecture || !correctingStudent) return;
    if (!correctionReason.trim()) {
      alert('A mandatory correction reason is required.');
      return;
    }

    setCorrectingLoading(true);
    try {
      const res = await fetch(`/api/lectures/${activeLecture.id}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: correctingStudent.student.id,
          status: newStatus,
          reason: correctionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to correct attendance.');

      setFeedback({
        type: 'success',
        message: `Attendance for ${correctingStudent.student.name} corrected to ${newStatus.toUpperCase()}. Audit log updated.`,
      });
      setCorrectingStudent(null);
      setCorrectionReason('');
      fetchRoster(activeLecture.id);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setCorrectingLoading(false);
    }
  };

  const isCurrentActive = activeLecture && !activeLecture.is_closed && activeLecture.status !== 'closed';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#101217] via-[#141720] to-[#0e1014] border border-white/10 shadow-card flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#d9ad3c]/20 text-[#e4c668] border border-[#d9ad3c]/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#d9ad3c]" /> Faculty Teaching Cockpit
            </span>
            {isCurrentActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Lecture In Progress
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#d9ad3c]" /> Lecture Management &amp; Dynamic QR Roll-Call
          </h2>
          <p className="text-xs text-[#9e988f]">
            Launch course lectures, broadcast 15-second dynamic attendance QR tokens, and manage live Present/Pending/Absent rosters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewLectureOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d9ad3c] to-[#e4c668] hover:from-[#e4c668] hover:to-[#f0d886] text-black font-semibold text-xs transition-all shadow-lg shadow-[#d9ad3c]/20 flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Start New Lecture
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
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Lecture Cockpit Card */}
      {activeLecture ? (
        <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-6 space-y-6 shadow-card relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#d9ad3c]/20 text-[#e4c668] border border-[#d9ad3c]/30">
                  {activeLecture.course?.code || 'CS'}
                </span>
                <span className="text-xs font-mono text-[#2dd4bf]">
                  Lecture #{activeLecture.lecture_number || 1}
                </span>
                <span className="text-xs text-[#9e988f]">•</span>
                <span className="text-xs font-mono text-[#9e988f]">
                  Class: {activeLecture.class?.name || 'All Enrolled'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {activeLecture.topic || activeLecture.title}
              </h3>
              <div className="flex items-center gap-4 text-xs font-mono text-[#9e988f] pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {activeLecture.session_date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {activeLecture.start_time} - {activeLecture.end_time} ({activeLecture.duration_minutes || 60}m)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isCurrentActive ? (
                <>
                  <button
                    onClick={() => setIsQRModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#2dd4bf]/10 hover:bg-[#2dd4bf]/20 border border-[#2dd4bf]/30 text-[#2dd4bf] text-xs font-semibold transition-colors flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Open 15s Dynamic QR
                  </button>
                  <button
                    onClick={handleCloseLecture}
                    className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition-colors flex items-center gap-2"
                  >
                    <StopCircle className="w-4 h-4" />
                    Conclude Lecture
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-[#9e988f]">
                    Lecture Concluded
                  </span>
                  <button
                    onClick={() => setIsNewLectureOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#d9ad3c] text-black text-xs font-semibold hover:bg-[#e4c668] transition-colors"
                  >
                    Start Next Lecture
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Live Roster Metrics (Requirement 8: Present, Pending, Absent) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[#9e988f] text-xs font-mono">
                <span>PRESENT</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {rosterData?.stats.present ?? activeLecture.total_present ?? 0}
              </div>
              <p className="text-[10px] text-emerald-400/80">Verified QR check-ins</p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[#9e988f] text-xs font-mono">
                <span>PENDING</span>
                <Clock className="w-4 h-4 text-[#e4c668]" />
              </div>
              <div className="text-2xl font-bold text-[#e4c668] font-mono">
                {isCurrentActive ? (rosterData?.stats.pending ?? activeLecture.total_pending ?? 0) : 0}
              </div>
              <p className="text-[10px] text-[#9e988f]">
                {isCurrentActive ? 'Not yet scanned' : 'Converted to absent'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[#9e988f] text-xs font-mono">
                <span>ABSENT</span>
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {rosterData?.stats.absent ?? activeLecture.total_absent ?? 0}
              </div>
              <p className="text-[10px] text-red-400/80">
                {isCurrentActive ? 'Manual absences' : 'Closed session absences'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[#9e988f] text-xs font-mono">
                <span>ATTENDANCE %</span>
                <Sparkles className="w-4 h-4 text-[#2dd4bf]" />
              </div>
              <div className="text-2xl font-bold text-[#2dd4bf] font-mono">
                {rosterData?.stats.attendancePct ?? 0}%
              </div>
              <p className="text-[10px] text-[#9e988f]">Class participation</p>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <div className="p-3 bg-black/50 border-b border-white/10 flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#d9ad3c]" />
                Lecture Attendance Roll ({rosterData?.students.length || 0} Enrolled)
              </span>
              <button
                onClick={() => fetchRoster(activeLecture.id)}
                disabled={rosterLoading}
                className="p-1 text-[#9e988f] hover:text-white"
                title="Refresh Roster"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rosterLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 text-[#9e988f] font-mono uppercase text-[10px] sticky top-0 border-b border-white/5">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Roll Number</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Check-In Time</th>
                    <th className="py-2.5 px-4">Verification Note</th>
                    <th className="py-2.5 px-4 text-right">Manual Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rosterData?.students.map((r, idx) => {
                    const st = r.status;
                    return (
                      <tr key={r.student.id || idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-white block">{r.student.name}</span>
                          <span className="text-[10px] text-[#9e988f] font-mono">{r.student.email}</span>
                        </td>

                        <td className="py-2.5 px-4 font-mono font-bold text-white">
                          {r.student.roll_number}
                        </td>

                        <td className="py-2.5 px-4">
                          {st === 'present' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Present
                            </span>
                          )}
                          {st === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Pending
                            </span>
                          )}
                          {st === 'absent' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Absent
                            </span>
                          )}
                          {st === 'late' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Late
                            </span>
                          )}
                          {st === 'excused' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Excused
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 font-mono text-[#9e988f]">
                          {r.check_in_time || '—'}
                        </td>

                        <td className="py-2.5 px-4 text-[#9e988f] text-[11px] truncate max-w-xs">
                          {r.remarks || '—'}
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setCorrectingStudent(r);
                              setNewStatus(r.status === 'present' ? 'absent' : 'present');
                              setCorrectionReason('');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-[#9e988f] hover:text-white transition-colors"
                          >
                            <Edit3 className="w-3 h-3" /> Correct
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-[#0f1115] border border-white/10 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#d9ad3c]/10 text-[#d9ad3c] flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">No active lecture session</h3>
            <p className="text-xs text-[#9e988f] mt-1">
              Select your assigned subject and start a new lecture with dynamic 15-second QR roll-call.
            </p>
          </div>
          <button
            onClick={() => setIsNewLectureOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-xs transition-colors"
          >
            Start Lecture Session
          </button>
        </div>
      )}

      {/* Previous Lectures History */}
      <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#d9ad3c]" />
            <h3 className="text-sm font-bold text-white">Conducted Lecture History</h3>
          </div>
          <span className="text-[11px] font-mono text-[#9e988f]">
            {lectures.length} Total Lectures
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {lectures.map((l) => {
            const isSelected = activeLecture?.id === l.id;
            const isClosed = l.is_closed || l.status === 'closed';

            return (
              <div
                key={l.id}
                onClick={() => setActiveLecture(l)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-black/60 border-[#d9ad3c]/50 shadow-md shadow-[#d9ad3c]/5'
                    : 'bg-black/30 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-[#e4c668] font-bold">
                    {l.course?.code || 'CS'} • #{l.lecture_number || 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      !isClosed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-[#9e988f]'
                    }`}
                  >
                    {!isClosed ? '● Live' : 'Concluded'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white truncate">{l.topic || l.title}</h4>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#9e988f] mt-3">
                  <span>{l.session_date}</span>
                  <span className="text-[#2dd4bf]">
                    {l.total_present || 0} Present / {l.total_absent || 0} Absent
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start New Lecture Modal */}
      {isNewLectureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Start New Lecture</h3>
                  <p className="text-xs text-[#9e988f]">Initializes 15-second rotating dynamic QR attendance</p>
                </div>
              </div>
              <button onClick={() => setIsNewLectureOpen(false)} className="text-[#9e988f] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartLecture} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Assigned Subject *</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Class / Section *</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.semester})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[#9e988f] block font-medium">Lecture Topic / Curriculum Item *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Consensus & Raft Algorithm"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Lecture # *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={lectureNumber}
                    onChange={(e) => setLectureNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Date</label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Duration (Mins)</label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10) || 60)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] text-[#9e988f] space-y-1">
                <span className="text-[#e4c668] font-bold block font-mono">Present / Absent Protocol:</span>
                <p>Enrolled students default to <strong>Pending</strong>. Only verified 15s dynamic QR scans mark students <strong>Present</strong>. Any remaining Pending students will transition to <strong>Absent</strong> when you conclude the lecture.</p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewLectureOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLecture}
                  className="px-5 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold transition-all shadow-md flex items-center gap-2"
                >
                  {creatingLecture ? 'Starting...' : 'Launch Lecture & QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Attendance Correction Modal (Requirement 8) */}
      {correctingStudent && activeLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Manual Attendance Override</h3>
                  <p className="text-xs text-[#9e988f]">{correctingStudent.student.name} ({correctingStudent.student.roll_number})</p>
                </div>
              </div>
              <button onClick={() => setCorrectingStudent(null)} className="text-[#9e988f] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCorrection} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                >
                  <option value="present">Present (Verified In-Class)</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late (Partial)</option>
                  <option value="excused">Excused (Medical / Official)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">
                  Mandatory Correction Reason * (Logged to Institutional Audit)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Student present in class; camera issue prevented QR scan."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCorrectingStudent(null)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctingLoading}
                  className="px-5 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold transition-all shadow-md"
                >
                  {correctingLoading ? 'Saving...' : 'Apply Correction & Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 15-Second Dynamic QR Projector Modal */}
      {activeLecture && isQRModalOpen && (
        <QRTerminal
          session={activeLecture}
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          onScanSuccess={() => {
            fetchLectures();
            if (activeLecture) fetchRoster(activeLecture.id);
          }}
        />
      )}
    </div>
  );
}

