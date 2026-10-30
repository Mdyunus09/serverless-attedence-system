'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Faculty, Department, Course, AcademicClass } from '@/lib/types';
import {
  Users,
  Search,
  UserPlus,
  ShieldCheck,
  Edit2,
  Lock,
  Unlock,
  RefreshCw,
  Mail,
  Building,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  KeyRound,
  Briefcase,
  BookOpen,
} from 'lucide-react';

interface Props {
  departments: Department[];
  courses: Course[];
  classes: AcademicClass[];
}

export default function FacultyManagementDesk({ departments, courses, classes }: Props) {
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Faculty Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmpId, setAddEmpId] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addDeptId, setAddDeptId] = useState(departments[0]?.id || 'dept-1');
  const [addDesignation, setAddDesignation] = useState('Assistant Professor');
  const [addPhone, setAddPhone] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit Faculty Modal State
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmpId, setEditEmpId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const fetchFaculty = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/faculty');
      const data = await res.json();
      if (data.faculty) {
        setFacultyList(data.faculty);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const handleToggleStatus = async (faculty: Faculty) => {
    const nextStatus = faculty.is_active === false ? true : false;
    const actionName = nextStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${actionName} the faculty account for ${faculty.name} (${faculty.employee_id})?`)) {
      return;
    }

    setActionLoadingId(faculty.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/faculty/${faculty.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update faculty status.');
      }
      setFeedback({
        type: 'success',
        message: `Faculty ${faculty.name} is now ${nextStatus ? 'Active' : 'Deactivated'}.`,
      });
      await fetchFaculty();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          employee_id: addEmpId.trim().toUpperCase(),
          email: addEmail.trim().toLowerCase(),
          department_id: addDeptId,
          designation: addDesignation.trim(),
          phone: addPhone.trim() || undefined,
          password: addPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create faculty member.');
      }

      setFeedback({
        type: 'success',
        message: `Faculty ${addName} successfully added with active login credentials.`,
      });
      setIsAddModalOpen(false);
      // Reset form
      setAddName('');
      setAddEmpId('');
      setAddEmail('');
      setAddPassword('');
      setAddPhone('');
      await fetchFaculty();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setAddSubmitting(false);
    }
  };

  const openEditModal = (fac: Faculty) => {
    setEditingFaculty(fac);
    setEditName(fac.name);
    setEditEmpId(fac.employee_id);
    setEditEmail(fac.email);
    setEditDeptId(fac.department_id);
    setEditDesignation(fac.designation);
    setEditPhone(fac.phone || '');
    setEditPassword('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaculty) return;

    setActionLoadingId(editingFaculty.id);
    try {
      const payload: any = {
        name: editName.trim(),
        employee_id: editEmpId.trim().toUpperCase(),
        email: editEmail.trim().toLowerCase(),
        department_id: editDeptId,
        designation: editDesignation.trim(),
        phone: editPhone.trim() || undefined,
      };

      if (editPassword && editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/faculty/${editingFaculty.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update faculty record.');
      }

      setFeedback({
        type: 'success',
        message: `Faculty record for ${editName} updated successfully.`,
      });
      setEditingFaculty(null);
      await fetchFaculty();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredFaculty = facultyList.filter((fac) => {
    const q = search.toLowerCase();
    const matchesSearch =
      fac.name.toLowerCase().includes(q) ||
      fac.employee_id.toLowerCase().includes(q) ||
      fac.email.toLowerCase().includes(q) ||
      fac.designation.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? fac.is_active !== false
        : fac.is_active === false;

    const matchesDept = deptFilter === 'all' ? true : fac.department_id === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header & Metric Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#101217] via-[#141720] to-[#0e1014] border border-white/10 shadow-card flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#d9ad3c]/20 text-[#e4c668] border border-[#d9ad3c]/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#d9ad3c]" /> Institutional Administration
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#d9ad3c]" /> Faculty &amp; Academic Staff Directory
          </h2>
          <p className="text-xs text-[#9e988f]">
            Register faculty accounts, manage teaching assignments, and configure institutional access controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d9ad3c] to-[#e4c668] hover:from-[#e4c668] hover:to-[#f0d886] text-black font-semibold text-xs transition-all shadow-lg shadow-[#d9ad3c]/20 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add New Faculty
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
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0e1014] p-4 rounded-xl border border-white/5">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9e988f]" />
            <input
              type="text"
              placeholder="Search by name, employee ID, email, or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]/50 transition-colors"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-[#f3efe6] focus:outline-none focus:border-[#d9ad3c]/50"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-[#f3efe6] focus:outline-none focus:border-[#d9ad3c]/50"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>

        <button
          onClick={fetchFaculty}
          disabled={loading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white transition-colors"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Faculty Table */}
      <div className="bg-[#0f1115] border border-white/10 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 border-b border-white/10 text-[#9e988f] font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Faculty Member</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department &amp; Designation</th>
                <th className="py-3 px-4">Assigned Subjects</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#9e988f]">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#d9ad3c]" />
                      Loading faculty directory...
                    </div>
                  </td>
                </tr>
              ) : filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#6b6660]">
                    No faculty found matching the current search filters.
                  </td>
                </tr>
              ) : (
                filteredFaculty.map((fac) => {
                  const dept = departments.find((d) => d.id === fac.department_id);
                  const isActive = fac.is_active !== false;

                  return (
                    <tr
                      key={fac.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        !isActive ? 'opacity-60 bg-red-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#d9ad3c]/15 text-[#e4c668] border border-[#d9ad3c]/30 flex items-center justify-center font-bold text-xs uppercase">
                            {fac.name.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{fac.name}</span>
                            <span className="text-[11px] text-[#9e988f] font-mono flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {fac.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          {fac.employee_id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-white block font-medium">{fac.designation}</span>
                        <span className="text-[11px] text-[#9e988f] flex items-center gap-1">
                          <Building className="w-3 h-3 text-[#2dd4bf]" /> {dept?.name || 'Computer Science'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {fac.assigned_course_ids && fac.assigned_course_ids.length > 0 ? (
                            fac.assigned_course_ids.map((cId) => {
                              const c = courses.find((course) => course.id === cId);
                              return (
                                <span
                                  key={cId}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-[#d9ad3c]"
                                >
                                  {c?.code || cId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-[#6b6660] italic">None assigned</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(fac)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white transition-colors"
                            title="Edit Faculty Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(fac)}
                            disabled={actionLoadingId === fac.id}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isActive
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                            title={isActive ? 'Deactivate Faculty Account' : 'Activate Faculty Account'}
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

      {/* Add New Faculty Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add New Faculty Account</h3>
                  <p className="text-xs text-[#9e988f]">Creates faculty profile and authentication credentials</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#9e988f] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Prof. Evelyn Carter"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="FAC-CS-103"
                    value={addEmpId}
                    onChange={(e) => setAddEmpId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.carter@cadence.edu"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Department *</label>
                  <select
                    value={addDeptId}
                    onChange={(e) => setAddDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Designation</label>
                  <input
                    type="text"
                    placeholder="Assistant Professor"
                    value={addDesignation}
                    onChange={(e) => setAddDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 234-5678"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Initial Password * (min. 6 characters)</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9e988f]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold transition-all shadow-md flex items-center gap-2"
                >
                  {addSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Register Faculty Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {editingFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Faculty Record</h3>
                  <p className="text-xs text-[#9e988f]">Update faculty credentials or profile attributes</p>
                </div>
              </div>
              <button onClick={() => setEditingFaculty(null)} className="text-[#9e988f] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={editEmpId}
                    onChange={(e) => setEditEmpId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Department</label>
                  <select
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Designation</label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#9e988f] block font-medium">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#d9ad3c]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#9e988f] block font-medium">Reset Password (leave empty to keep unchanged)</label>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingFaculty(null)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9e988f] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold transition-all"
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

