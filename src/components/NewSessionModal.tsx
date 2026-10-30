'use client';

import React, { useState } from 'react';
import { Course, Session } from '@/lib/types';
import { Plus, X, Calendar, Clock, Layers, RefreshCw } from 'lucide-react';

interface Props {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (session: Session) => void;
}

export default function NewSessionModal({ course, isOpen, onClose, onCreated }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState<'lecture' | 'lab' | 'seminar' | 'quiz'>('lecture');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id,
          session_date: date,
          start_time: startTime,
          end_time: endTime,
          title: title.trim(),
          session_type: sessionType,
        }),
      });

      const data = await res.json();
      if (data.session) {
        onCreated(data.session);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0f1115] border border-white/10 rounded-xl shadow-2xl p-6 text-sm text-[#e2ded7]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-semibold text-white">Launch New Attendance Session</h3>
            <p className="text-xs text-[#9e988f]">{course.code} • {course.title}</p>
          </div>
          <button onClick={onClose} className="text-[#9e988f] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#9e988f] mb-1">Session Topic / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Consensus & Raft Protocols"
              className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#9e988f] mb-1">Session Type</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
              >
                <option value="lecture">Lecture</option>
                <option value="lab">Hands-on Lab</option>
                <option value="seminar">Seminar / Discussion</option>
                <option value="quiz">Quiz / Exam</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9e988f] mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#9e988f] mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9e988f] mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#9e988f] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Start Live Attendance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

