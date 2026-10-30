'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Session, AttendanceRecord, AttendanceStatus } from '@/lib/types';
import {
  Check,
  X,
  Clock,
  Shield,
  CheckCheck,
  RotateCcw,
  Lock,
  Search,
  SlidersHorizontal,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  session: Session;
  onSessionUpdated?: () => void;
  onOpenQR: () => void;
}

export default function LiveRollCall({ session, onSessionUpdated, onOpenQR }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  const [isLocked, setIsLocked] = useState(session.is_closed);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sessions/${session.id}/attendance`);
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => {
    fetchRecords();
    setIsLocked(session.is_closed);
  }, [fetchRecords, session.is_closed]);

  const updateStatus = async (studentId: string, newStatus: AttendanceStatus, remarks?: string) => {
    if (isLocked) return;
    setSavingId(studentId);

    // Optimistic UI update
    setRecords((prev) =>
      prev.map((r) =>
        r.student_id === studentId
          ? {
              ...r,
              status: newStatus,
              check_in_time: newStatus === 'absent' ? undefined : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              remarks: remarks !== undefined ? remarks : r.remarks,
            }
          : r
      )
    );

    try {
      await fetch(`/api/sessions/${session.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status: newStatus, remarks }),
      });
      if (onSessionUpdated) onSessionUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const markAll = async (status: AttendanceStatus) => {
    if (isLocked) return;
    const updates = records.map((r) => ({
      studentId: r.student_id,
      status,
      remarks: status === 'present' ? 'Batch roll call present' : undefined,
    }));

    // Optimistic
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status,
        check_in_time: status === 'absent' ? undefined : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    );

    try {
      await fetch(`/api/sessions/${session.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, updates }),
      });
      if (onSessionUpdated) onSessionUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLockSession = async () => {
    if (!confirm('Locking this session will finalize attendance and prevent further alterations. Proceed?')) return;
    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      setIsLocked(true);
      if (onSessionUpdated) onSessionUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered list
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.student?.roll_number.toLowerCase().includes(search.toLowerCase()) ||
      r.student?.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate live stats
  const total = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;
  const effectivePct = total > 0 ? Math.round(((presentCount + lateCount * 0.75 + excusedCount) / total) * 100) : 0;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveRowIndex((prev) => Math.min(filteredRecords.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveRowIndex((prev) => Math.max(0, prev - 1));
      } else if (filteredRecords[activeRowIndex]) {
        const studentId = filteredRecords[activeRowIndex].student_id;
        if (e.key.toLowerCase() === 'p' || e.code === 'Space') {
          e.preventDefault();
          updateStatus(studentId, 'present');
          setActiveRowIndex((prev) => Math.min(filteredRecords.length - 1, prev + 1));
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          updateStatus(studentId, 'absent');
          setActiveRowIndex((prev) => Math.min(filteredRecords.length - 1, prev + 1));
        } else if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          updateStatus(studentId, 'late');
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          updateStatus(studentId, 'excused');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredRecords, activeRowIndex, isLocked]);

  return (
    <div className="space-y-4">
      {/* Metrics Banner */}
      <div className="p-4 rounded-xl bg-[#0e1014] border border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9e988f] block">Session</span>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              {session.title}
              <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#e4c668] uppercase font-mono">
                {session.session_type}
              </span>
            </div>
            <span className="text-xs text-[#9e988f]">
              {session.session_date} • {session.start_time} - {session.end_time}
            </span>
          </div>

          <div className="h-8 w-px bg-white/10 hidden md:block" />

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Present: <strong>{presentCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Late: <strong>{lateCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Absent: <strong>{absentCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Excused: <strong>{excusedCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Attendance Percentage Meter */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-[#9e988f]">Session Rate</div>
            <div className="text-lg font-bold font-mono text-white tabular-nums">
              {effectivePct}%
            </div>
          </div>
          <div className="w-24 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-500 ${
                effectivePct >= 75 ? 'bg-[#2dd4bf]' : 'bg-amber-400'
              }`}
              style={{ width: `${effectivePct}%` }}
            />
          </div>

          <button
            onClick={onOpenQR}
            className="ml-2 px-3.5 py-1.5 rounded-lg bg-[#d9ad3c]/15 hover:bg-[#d9ad3c]/25 border border-[#d9ad3c]/30 text-[#d9ad3c] text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch QR Check-in
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#9e988f] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or roll number..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0e1014] border border-white/10 rounded-lg text-xs text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
            />
          </div>

          <div className="flex items-center bg-[#0e1014] border border-white/10 rounded-lg p-0.5 text-xs font-mono">
            {(['all', 'present', 'late', 'absent', 'excused'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-[#9e988f] hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Operations & Keyboard Hint */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-[#6b6660] bg-white/5 px-2.5 py-1 rounded border border-white/5">
            <span>Hotkeys:</span>
            <kbd className="px-1 py-0.5 bg-black/40 rounded border border-white/10 text-[#9e988f]">P</kbd>
            <kbd className="px-1 py-0.5 bg-black/40 rounded border border-white/10 text-[#9e988f]">A</kbd>
            <kbd className="px-1 py-0.5 bg-black/40 rounded border border-white/10 text-[#9e988f]">L</kbd>
            <kbd className="px-1 py-0.5 bg-black/40 rounded border border-white/10 text-[#9e988f]">E</kbd>
            <kbd className="px-1 py-0.5 bg-black/40 rounded border border-white/10 text-[#9e988f]">↓/↑</kbd>
          </div>

          <button
            onClick={() => markAll('present')}
            disabled={isLocked}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All Present
          </button>

          <button
            onClick={() => markAll('absent')}
            disabled={isLocked}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#9e988f] hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Roll
          </button>

          <button
            onClick={handleLockSession}
            disabled={isLocked}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isLocked
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 cursor-not-allowed'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            {isLocked ? 'Roll Finalized' : 'Lock Session'}
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0d10]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-[#101217] text-[#9e988f] font-mono text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Student Name</th>
              <th className="py-2.5 px-3">Roll ID</th>
              <th className="py-2.5 px-3">Recorded Time</th>
              <th className="py-2.5 px-3">Remarks / Verification</th>
              <th className="py-2.5 px-3 text-right">Attendance Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#9e988f]">
                  No student records found matching filter.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec, index) => {
                const isSelected = index === activeRowIndex;
                const stu = rec.student;
                return (
                  <tr
                    key={rec.id}
                    onClick={() => setActiveRowIndex(index)}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-mono text-[#6b6660]">
                      {index + 1}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#181a20] border border-white/10 flex items-center justify-center font-medium text-[11px] text-[#e4c668]">
                          {stu?.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white">{stu?.name}</div>
                          <div className="text-[11px] text-[#9e988f]">{stu?.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[#e4c668]">
                      {stu?.roll_number}
                    </td>

                    <td className="py-3 px-3 font-mono text-[#9e988f]">
                      {rec.check_in_time || '—'}
                    </td>

                    <td className="py-3 px-3">
                      {editingRemarkId === rec.student_id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={remarkText}
                            onChange={(e) => setRemarkText(e.target.value)}
                            placeholder="Add reason/note..."
                            className="px-2 py-1 bg-black/50 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateStatus(rec.student_id, rec.status, remarkText);
                                setEditingRemarkId(null);
                              } else if (e.key === 'Escape') {
                                setEditingRemarkId(null);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              updateStatus(rec.student_id, rec.status, remarkText);
                              setEditingRemarkId(null);
                            }}
                            className="px-2 py-1 bg-[#d9ad3c] text-black font-semibold rounded text-[11px]"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingRemarkId(rec.student_id);
                            setRemarkText(rec.remarks || '');
                          }}
                          className="flex items-center gap-1.5 text-[#9e988f] hover:text-white cursor-pointer group"
                        >
                          <span className="truncate max-w-[200px]">
                            {rec.remarks || 'Click to add remark'}
                          </span>
                          <MessageSquare className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1 bg-[#14161c] p-1 rounded-lg border border-white/5">
                        {/* Present */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(rec.student_id, 'present');
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                            rec.status === 'present'
                              ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                              : 'text-[#9e988f] hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          P
                        </button>

                        {/* Late */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(rec.student_id, 'late');
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                            rec.status === 'late'
                              ? 'bg-amber-400 text-black font-semibold shadow-sm'
                              : 'text-[#9e988f] hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          L
                        </button>

                        {/* Absent */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(rec.student_id, 'absent');
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                            rec.status === 'absent'
                              ? 'bg-rose-500 text-white font-semibold shadow-sm'
                              : 'text-[#9e988f] hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          A
                        </button>

                        {/* Excused */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(rec.student_id, 'excused');
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                            rec.status === 'excused'
                              ? 'bg-sky-500 text-white font-semibold shadow-sm'
                              : 'text-[#9e988f] hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          E
                        </button>
                      </div>
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

