'use client';

import React, { useState, useEffect } from 'react';
import { LeaveRequest, Course, Student } from '@/lib/types';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Plus,
  RefreshCw,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';

interface Props {
  course: Course;
  onLeaveUpdated?: () => void;
}

export default function LeaveDesk({ course, onLeaveUpdated }: Props) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [reviewNoteId, setReviewNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New leave form state
  const [newStudentId, setNewStudentId] = useState('stu-3');
  const [startDate, setStartDate] = useState('2026-11-02');
  const [endDate, setEndDate] = useState('2026-11-03');
  const [reason, setReason] = useState('');
  const [proofUrl, setProofUrl] = useState('https://univ-portal.edu/docs/official_duty.pdf');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leave');
      const data = await res.json();
      if (data.requests) {
        setRequests(data.requests);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleReview = async (id: string, status: 'approved' | 'rejected', reviewNote?: string) => {
    try {
      await fetch(`/api/leave/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedBy: course.instructor_name || 'Dr. Alistair Vance',
          reviewNote: reviewNote || (status === 'approved' ? 'Leave granted upon institutional review.' : 'Insufficient documentation provided.'),
        }),
      });
      await fetchLeaves();
      if (onLeaveUpdated) onLeaveUpdated();
      setReviewNoteId(null);
      setNoteText('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: newStudentId,
          course_id: course.id,
          start_date: startDate,
          end_date: endDate,
          reason,
          proof_url: proofUrl,
        }),
      });
      if (res.ok) {
        setIsApplyOpen(false);
        setReason('');
        await fetchLeaves();
        if (onLeaveUpdated) onLeaveUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#0e1014] border border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white flex items-center gap-2">
            Leave Applications &amp; Attendance Rectification
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-xs text-[#9e988f]">
            Approving leave automatically updates the affected class records to &apos;Excused&apos; and restores attendance standing.
          </p>
        </div>

        <button
          onClick={() => setIsApplyOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Submit Leave Request
        </button>
      </div>

      {/* Requests Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0d10]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-[#101217] text-[#9e988f] font-mono text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Student</th>
              <th className="py-2.5 px-3">Duration &amp; Date</th>
              <th className="py-2.5 px-3">Reason &amp; Documentation</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Review Details</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#9e988f]">
                  No leave applications on record.
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const isPending = req.status === 'pending';
                const isApproved = req.status === 'approved';

                return (
                  <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-medium text-white">{req.student?.name}</div>
                      <div className="font-mono text-[11px] text-[#e4c668]">{req.student?.roll_number}</div>
                    </td>

                    <td className="py-3 px-3 font-mono text-xs text-[#e2ded7]">
                      {req.start_date} <span className="text-[#9e988f]">to</span> {req.end_date}
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <p className="text-white line-clamp-2 leading-relaxed">{req.reason}</p>
                      {req.proof_url && (
                        <a
                          href={req.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#2dd4bf] hover:underline mt-1"
                        >
                          <FileText className="w-3 h-3" />
                          View Document Attachment
                        </a>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-xs">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      ) : req.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-rose-400 bg-rose-500/10 border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-amber-400 bg-amber-500/10 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-xs text-[#9e988f]">
                      {req.reviewed_by ? (
                        <div>
                          <div className="text-white font-medium">{req.reviewed_by}</div>
                          <div className="text-[11px] text-[#9e988f] italic">&quot;{req.review_note}&quot;</div>
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-[#6b6660]">Awaiting Instructor Action</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {isPending ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleReview(req.id, 'approved')}
                            className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(req.id, 'rejected')}
                            className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-[#6b6660]">Resolved</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Apply Leave Modal */}
      {isApplyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-xl shadow-2xl p-6 text-sm text-[#e2ded7]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-semibold text-white">Student Leave Application Form</h3>
              <button
                onClick={() => setIsApplyOpen(false)}
                className="text-[#9e988f] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#9e988f] mb-1">Select Student</label>
                <select
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
                >
                  <option value="stu-3">CS2023-009 — Devanagari Rao</option>
                  <option value="stu-5">CS2023-015 — Julian Hayes</option>
                  <option value="stu-7">CS2023-022 — Kaelen O&apos;Connor</option>
                  <option value="stu-11">CS2023-037 — Niko Bellicose</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#9e988f] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9e988f] mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9e988f] mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Detail the circumstance (medical emergency, official event, bereavement)..."
                  className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9e988f] mb-1">Proof Document URL</label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#9e988f] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Submit Appeal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

