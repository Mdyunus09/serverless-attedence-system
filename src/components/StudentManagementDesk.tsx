'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Student, Department } from '@/lib/types';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Lock,
  Unlock,
  RefreshCw,
  Mail,
  Building,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  X,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

interface Props {
  departments: Department[];
  onOpenEnrollModal: () => void;
}

export default function StudentManagementDesk({ departments, onOpenEnrollModal }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRoll, setEditRoll] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editBatchYear, setEditBatchYear] = useState('');

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.students) {
        setStudents(data.students);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleToggleStatus = async (student: Student) => {
    const nextStatus = student.is_active === false ? true : false;
    const actionName = nextStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${actionName} the account for ${student.name} (${student.roll_number})?`)) {
      return;
    }

    setActionLoadingId(student.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update account status.');
      }
      setFeedback({
        type: 'success',
        message: `Student ${student.name} is now ${nextStatus ? 'Active' : 'Deactivated'}.`,
      });
      await fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditRoll(student.roll_number);
    setEditEmail(student.email);
    setEditDeptId(student.department_id);
    setEditBatchYear(student.batch_year || '2023-2027');
    setEditPassword('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setActionLoadingId(editingStudent.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          roll_number: editRoll.trim().toUpperCase(),
          email: editEmail.trim().toLowerCase(),
          department_id: editDeptId,
          batch_year: editBatchYear.trim(),
          password: editPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save changes.');
      }
      setFeedback({ type: 'success', message: `Updated details for ${editName}.` });
      setEditingStudent(null);
      await fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? s.is_active !== false
        : s.is_active === false;

    const matchesDept = deptFilter === 'all' || s.department_id === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const activeCount = students.filter((s) => s.is_active !== false).length;
  const deactivatedCount = students.filter((s) => s.is_active === false).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Metric Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0f1115] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Student Directory &amp; Account Management</h2>
            <p className="text-xs text-[#9e988f]">
              Institutional student roster, bcrypt credential provisioning &amp; access control
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Metrics */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#141720] border border-white/5 text-xs font-mono">
            <span className="text-[#9e988f]">Total: <strong className="text-white">{students.length}</strong></span>
            <span className="text-white/20">•</span>
            <span className="text-emerald-400">Active: <strong>{activeCount}</strong></span>
            {deactivatedCount > 0 && (
              <>
                <span className="text-white/20">•</span>
                <span className="text-rose-400">Deactivated: <strong>{deactivatedCount}</strong></span>
              </>
            )}
          </div>

          {/* Add Student Button */}
          <button
            onClick={onOpenEnrollModal}
            className="px-4 py-2 rounded-xl bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-xs tracking-wide transition-all flex items-center gap-2 shadow-lg shadow-[#d9ad3c]/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Student</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, roll, email..."
            className="w-full bg-[#141720] border border-white/10 rounded-xl px-3.5 py-2 pl-9 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#d9ad3c] transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-[#9e988f] absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-[#141720] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d9ad3c] transition-colors cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center bg-[#141720] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                statusFilter === 'all' ? 'bg-[#d9ad3c] text-black font-semibold' : 'text-[#9e988f] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-[#9e988f] hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('deactivated')}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                statusFilter === 'deactivated' ? 'bg-rose-500/20 text-rose-400 font-semibold' : 'text-[#9e988f] hover:text-white'
              }`}
            >
              Deactivated
            </button>
          </div>
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="rounded-2xl bg-[#0f1115] border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#12141a] text-[#9e988f] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Student &amp; Identity</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Department &amp; Batch</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#9e988f] font-mono">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#d9ad3c]" />
                    Loading student directory...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#9e988f] font-mono">
                    No students matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => {
                  const isActive = stu.is_active !== false;
                  const dept = stu.department || departments.find((d) => d.id === stu.department_id);
                  const compliancePct = stu.stats?.percentage ?? 85;

                  return (
                    <tr
                      key={stu.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        !isActive ? 'opacity-60 bg-rose-500/[0.02]' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0 font-mono">
                            {stu.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {stu.name}
                              {!isActive && (
                                <span className="text-[10px] font-mono text-rose-400 font-normal">
                                  (Deactivated)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#9e988f] font-mono truncate max-w-[180px]">
                              {stu.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Roll Number */}
                      <td className="py-3.5 px-4 font-mono font-medium text-white">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#d9ad3c]">
                          {stu.roll_number}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="text-white font-medium">{dept?.code || 'CS'}</div>
                        <div className="text-[10px] text-[#9e988f]">{stu.batch_year || '2023-2027'}</div>
                      </td>

                      {/* Attendance Compliance */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              compliancePct >= 75 ? 'text-emerald-400' : 'text-[#d9ad3c]'
                            }`}
                          >
                            {compliancePct}%
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${
                              compliancePct >= 75
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-[#d9ad3c]/10 text-[#e4c668]'
                            }`}
                          >
                            {compliancePct >= 75 ? 'Eligible' : 'Shortage'}
                          </span>
                        </div>
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                            isActive
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              ACTIVE
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              DEACTIVATED
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(stu)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white transition-colors"
                            title="Edit student details & password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Deactivate */}
                          <button
                            onClick={() => handleToggleStatus(stu)}
                            disabled={actionLoadingId === stu.id}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isActive
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                            }`}
                            title={isActive ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
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

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 text-sm text-[#e2ded7] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Edit Student &amp; Credentials</h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-[#9e988f] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs text-[#9e988f]">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#9e988f]">Roll Number</label>
                <input
                  type="text"
                  value={editRoll}
                  onChange={(e) => setEditRoll(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#9e988f]">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#9e988f]">Department</label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#9e988f]">Reset Password (optional)</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#e2ded7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === editingStudent.id}
                  className="px-5 py-2 rounded-xl bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

