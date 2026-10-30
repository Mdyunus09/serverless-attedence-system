'use client';

import React, { useState, useEffect } from 'react';
import { AuditLog, Course } from '@/lib/types';
import { ShieldCheck, History, Calendar, BarChart2, FileCheck, User } from 'lucide-react';

interface Props {
  course: Course;
}

export default function AuditDesk({ course }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/audit');
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-5">
      {/* Analytics Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1014] border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[#9e988f]">
            <span>Day-of-Week Pattern</span>
            <Calendar className="w-3.5 h-3.5 text-[#d9ad3c]" />
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-[#9e988f] mb-1">
                <span>Monday 10:00 AM</span>
                <span className="font-mono text-white">88%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#2dd4bf] rounded-full" style={{ width: '88%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[#9e988f] mb-1">
                <span>Wednesday 10:00 AM</span>
                <span className="font-mono text-white">94%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#2dd4bf] rounded-full" style={{ width: '94%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[#9e988f] mb-1">
                <span>Friday 10:00 AM (Lab)</span>
                <span className="font-mono text-white">82%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '82%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1014] border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[#9e988f]">
            <span>Format Distribution</span>
            <BarChart2 className="w-3.5 h-3.5 text-[#2dd4bf]" />
          </div>
          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
              <span className="text-[#9e988f]">Lecture Attendance</span>
              <span className="text-[#2dd4bf] font-semibold">91.4% Avg</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
              <span className="text-[#9e988f]">Hands-on Lab Attendance</span>
              <span className="text-[#e4c668] font-semibold">86.2% Avg</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
              <span className="text-[#9e988f]">Unexcused Absence Rate</span>
              <span className="text-rose-400 font-semibold">5.8%</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1014] border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[#9e988f]">
            <span>Faculty Verification</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xs space-y-1.5">
            <div className="text-white font-medium">{course.instructor_name}</div>
            <div className="text-[11px] text-[#9e988f]">Department of Computer Science</div>
            <div className="text-[11px] text-[#9e988f]">Room: {course.room}</div>
            <div className="pt-2 text-[10px] font-mono text-[#6b6660]">
              Audited according to Institutional Regulation Sec 4.2
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="rounded-xl border border-white/10 bg-[#0c0d10] overflow-hidden">
        <div className="p-3 bg-[#101217] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#d9ad3c]" />
            <span className="text-xs font-semibold text-white">System Ledger &amp; Modification Audit Trail</span>
          </div>
          <span className="text-[11px] font-mono text-[#9e988f]">{logs.length} Logged Entries</span>
        </div>

        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="p-3 hover:bg-white/[0.02] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-[#e4c668]">
                  {log.action}
                </span>
                <div>
                  <span className="text-white font-medium">{log.details}</span>
                  <div className="text-[11px] text-[#9e988f] flex items-center gap-1.5 mt-0.5">
                    <User className="w-3 h-3 text-[#6b6660]" />
                    <span>Actor: {log.actor}</span>
                    <span>• Target: {log.target_type} ({log.target_id})</span>
                  </div>
                </div>
              </div>

              <span className="font-mono text-[11px] text-[#6b6660] shrink-0">
                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

