'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  LogOut,
  Lock,
  User,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
import { AuthUser } from '@/lib/auth/types';

function StudentCheckInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token') || '';

  const [token, setToken] = useState(urlToken);
  const [studentId, setStudentId] = useState('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    studentName?: string;
    courseTitle?: string;
  } | null>(null);

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken);
    }
  }, [urlToken]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.role === 'student') {
            setStudentId(data.user.studentId || data.user.email);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !studentId.trim()) return;

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/qr/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: token.trim(),
          studentIdOrEmail: studentId.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: data.message,
          studentName: data.studentName,
          courseTitle: data.courseTitle,
        });
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Verification failed',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Network error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const isStudentLocked = currentUser?.role === 'student';

  return (
    <div className="min-h-screen bg-[#08090b] text-[#f3efe6] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#d9ad3c]/10 via-[#2dd4bf]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative z-10">
        {/* Navigation & Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {currentUser?.role !== 'student' ? (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-[#9e988f] hover:text-[#d9ad3c] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
            ) : (
              <span className="text-[11px] font-mono text-[#9e988f] flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> Student Verification Desk
              </span>
            )}

            {currentUser && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-[#9e988f] hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c] shadow-sm shadow-[#d9ad3c]/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Student Check-In Portal</h1>
              <p className="text-xs text-[#9e988f]">Live Presence Authentication</p>
            </div>
          </div>

          {/* Authenticated User Identity Pill */}
          {currentUser && (
            <div className="p-2.5 rounded-xl bg-[#141720] border border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 flex items-center justify-center text-[#2dd4bf]">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-white leading-none">{currentUser.name}</div>
                  <div className="text-[10px] text-[#9e988f] font-mono mt-0.5">{currentUser.email}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {currentUser.role}
              </span>
            </div>
          )}
        </div>

        {/* Feedback Alert / Verification Receipt */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold text-sm">
                  {feedback.type === 'success' ? 'Attendance Recorded' : 'Check-In Error'}
                </div>
                <div>{feedback.message}</div>
              </div>
            </div>

            {feedback.type === 'success' && (
              <div className="pt-2 border-t border-emerald-500/20 font-mono text-[11px] text-emerald-400">
                Timestamp: {new Date().toLocaleTimeString()} • Verified by Cryptographic Token
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#9e988f] mb-1.5">
              Session Check-In Token
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. CADENCE-TOKEN-X79K2"
              className="w-full px-3.5 py-2.5 bg-[#14171d] border border-white/10 rounded-xl font-mono text-sm text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
              required
            />
            <span className="text-[11px] text-[#6b6660] mt-1 block">
              Token currently displayed on classroom projector screen.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#9e988f]">
                Roll Number / Student Identifier
              </label>
              {isStudentLocked && (
                <span className="text-[10px] font-mono text-[#2dd4bf] flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Locked to Profile
                </span>
              )}
            </div>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. CS2023-001 or arjun.m@student.univ.edu"
              readOnly={isStudentLocked}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono transition-colors ${
                isStudentLocked
                  ? 'bg-[#181b24] border-white/10 text-[#e4c668] cursor-not-allowed'
                  : 'bg-[#14171d] border-white/10 text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]'
              }`}
              required
            />
            {isStudentLocked && (
              <span className="text-[10px] text-[#2dd4bf]/80 mt-1 block font-mono">
                ✓ Identity verified via AWS Cognito RBAC (Anti-Proxy Protection Active)
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#d9ad3c]/10 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Confirm Presence
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-[#6b6660]">
            Demo quick logins: <code className="text-[#9e988f]">CS2023-001</code>, <code className="text-[#9e988f]">CS2023-004</code>, <code className="text-[#9e988f]">CS2023-009</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StudentPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08090b] flex items-center justify-center text-white text-xs font-mono">Loading Student Portal...</div>}>
      <StudentCheckInContent />
    </Suspense>
  );
}
