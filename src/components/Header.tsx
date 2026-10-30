'use client';

import React from 'react';
import { Course, DatabaseStatus } from '@/lib/types';
import { Database, Plus, FileSpreadsheet, ExternalLink, ChevronDown, Layers } from 'lucide-react';
import Link from 'next/link';

interface Props {
  courses: Course[];
  selectedCourse: Course | null;
  onSelectCourse: (course: Course) => void;
  dbStatus: DatabaseStatus | null;
  onOpenNeonModal: () => void;
  onNewSession: () => void;
}

export default function Header({
  courses,
  selectedCourse,
  onSelectCourse,
  dbStatus,
  onOpenNeonModal,
  onNewSession,
}: Props) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090b0e]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Course Selector */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#d9ad3c] flex items-center justify-center font-bold text-black text-sm tracking-tighter shadow-sm shadow-[#d9ad3c]/30">
              CA
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                CADENCE
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-[#d9ad3c]">v2.4</span>
              </div>
              <div className="text-[10px] font-mono text-[#9e988f]">Institutional Attendance Intelligence</div>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Course Dropdown */}
          <div className="relative group">
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c.id === e.target.value);
                if (found) onSelectCourse(found);
              }}
              className="appearance-none bg-[#12141a] hover:bg-[#181a22] border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-white focus:outline-none focus:border-[#d9ad3c] cursor-pointer transition-colors"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#9e988f] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Right: DB Status Pill & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Neon Cloud Database Status Pill */}
          <button
            onClick={onOpenNeonModal}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 border ${
              dbStatus?.connected
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/15'
            }`}
            title="Click to view Neon Database integration details"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dbStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden md:inline">
              {dbStatus?.connected ? `Neon Cloud (${dbStatus.latencyMs}ms)` : 'Neon DB Config'}
            </span>
            <Database className="w-3.5 h-3.5 text-[#9e988f]" />
          </button>

          {/* Student Portal Link */}
          <Link
            href="/student-portal"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[#e2ded7] transition-colors"
          >
            <span>Student Portal</span>
            <ExternalLink className="w-3 h-3 text-[#9e988f]" />
          </Link>

          {/* New Session Button */}
          <button
            onClick={onNewSession}
            className="px-3.5 py-1.5 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-[#d9ad3c]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Launch</span> Session
          </button>
        </div>
      </div>
    </header>
  );
}

