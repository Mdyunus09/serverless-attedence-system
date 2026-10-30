'use client';

import React, { useState } from 'react';
import { Department, AcademicClass } from '@/lib/types';
import {
  X,
  UserPlus,
  Mail,
  Hash,
  Building,
  KeyRound,
  Sparkles,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  classes?: AcademicClass[];
  onStudentEnrolled: () => void;
}

export default function EnrollStudentModal({
  isOpen,
  onClose,
  departments,
  classes = [],
  onStudentEnrolled,
}: Props) {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'dept-1');
  const [classId, setClassId] = useState(classes[0]?.id || 'class-1');
  const [batchYear, setBatchYear] = useState('2023-2027');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim() || !rollNumber.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          roll_number: rollNumber.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          department_id: departmentId,
          class_id: classId,
          batch_year: batchYear.trim(),
          phone: phone.trim() || undefined,
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to enroll student.');
      }

      setSuccessMsg(`Student ${data.student.name} enrolled with roll #${data.student.roll_number}!`);
      setTimeout(() => {
        onStudentEnrolled();
        onClose();
        setName('');
        setRollNumber('');
        setEmail('');
        setPassword('');
        setPhone('');
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error creating student account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 text-sm text-[#e2ded7] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Enroll New Student</h2>
              <p className="text-xs text-[#9e988f]">Create institutional identity &amp; student authentication account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9e988f] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-medium text-[#9e988f]">Full Student Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Patel"
                required
                className="w-full bg-[#141720] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#d9ad3c] transition-colors"
              />
            </div>

            {/* University Roll Number */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#9e988f]">University Roll Number *</label>
              <div className="relative">
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. CS2023-055"
                  required
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3.5 py-2 pl-9 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#d9ad3c] transition-colors"
                />
                <Hash className="w-3.5 h-3.5 text-[#9e988f] absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Institutional Email */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#9e988f]">Institutional Email *</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aarav.p@student.univ.edu"
                  required
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3.5 py-2 pl-9 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#d9ad3c] transition-colors"
                />
                <Mail className="w-3.5 h-3.5 text-[#9e988f] absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#9e988f]">Department *</label>
              <div className="relative">
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d9ad3c] transition-colors cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Class / Section */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#9e988f]">Academic Class / Section *</label>
              <div className="relative">
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d9ad3c] transition-colors cursor-pointer"
                >
                  {classes && classes.length > 0 ? (
                    classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.semester})
                      </option>
                    ))
                  ) : (
                    <option value="class-1">CS-Year3-SecA</option>
                  )}
                </select>
              </div>
            </div>

            {/* Batch Year */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#9e988f]">Batch Academic Year</label>
              <input
                type="text"
                value={batchYear}
                onChange={(e) => setBatchYear(e.target.value)}
                placeholder="2023-2027"
                className="w-full bg-[#141720] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#d9ad3c] transition-colors"
              />
            </div>

            {/* Temporary Password */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#9e988f]">Temporary Login Password *</label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[11px] font-mono text-[#d9ad3c] hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Generate Password
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters (e.g. TempPass#2026)"
                  required
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-3.5 py-2 pl-9 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#d9ad3c] transition-colors"
                />
                <KeyRound className="w-3.5 h-3.5 text-[#9e988f] absolute left-3 top-2.5 pointer-events-none" />
              </div>
              <p className="text-[10px] text-[#6b6660]">
                Password will be hashed using Bcrypt. Student can sign in immediately at <span className="text-[#9e988f]">/login</span>.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-[#e2ded7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#d9ad3c] hover:bg-[#e6bd4b] disabled:opacity-50 text-black font-semibold text-xs tracking-wide transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-[#d9ad3c]/20"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Enrolling...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Enroll Student</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

