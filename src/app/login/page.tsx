'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  Sparkles,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { DEMO_USERS, UserRole } from '@/lib/auth/types';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setDbConnected(Boolean(data.connected));
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();

      if (data.success) {
        // Redirect based on role
        if (data.user?.role === 'student' && redirectUrl === '/') {
          router.push('/student-portal');
        } else {
          router.push(redirectUrl);
        }
        router.refresh();
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    handleLogin(email, password);
  };

  const handleQuickDemoLogin = (demoEmail: string, demoRole: UserRole) => {
    const demo = DEMO_USERS[demoEmail];
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.passwordHint);
      handleLogin(demo.email, demo.passwordHint);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090b] text-[#f3efe6] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#d9ad3c]/10 via-[#2dd4bf]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d9ad3c] to-[#b38924] text-black font-extrabold text-xl shadow-lg shadow-[#d9ad3c]/20 mb-2">
            CA
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            CADENCE
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-white/10 text-[#d9ad3c] border border-white/10">
              v2.4
            </span>
          </h1>
          <p className="text-xs font-mono text-[#9e988f]">
            Institutional Attendance Intelligence • Unified RBAC
          </p>
        </div>

        {/* Auth Mode Indicator */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0e1014] border border-white/5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Database className={`w-3.5 h-3.5 ${dbConnected ? 'text-[#2dd4bf]' : 'text-[#d9ad3c]'}`} />
            <span className="text-[#9e988f]">Auth Store:</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              dbConnected
                ? 'bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/30'
                : 'bg-[#d9ad3c]/10 text-[#e4c668] border border-[#d9ad3c]/30'
            }`}
          >
            {dbConnected ? 'Neon PostgreSQL (Cloud Pool)' : 'Neon PostgreSQL (Memory Fallback)'}
          </span>
        </div>

        {/* Login Card */}
        <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#9e988f]">Institutional Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cadence.edu"
                  required
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#d9ad3c] transition-colors"
                />
                <Mail className="w-4 h-4 text-[#9e988f] absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#9e988f]">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#141720] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#d9ad3c] transition-colors"
                />
                <KeyRound className="w-4 h-4 text-[#9e988f] absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#d9ad3c] hover:bg-[#e6bd4b] disabled:opacity-50 text-black font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-[#d9ad3c]/20 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  <span>Sign In with Secure Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Switch Demo Section */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#9e988f] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#d9ad3c]" /> Quick Role Evaluation
              </span>
              <span className="text-[10px] text-[#6b6660] font-mono">1-click demo</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Admin Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@cadence.edu', 'admin')}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#141720] hover:bg-[#1b202c] border border-white/5 hover:border-[#d9ad3c]/50 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5 text-[#d9ad3c]" />
                  <span className="text-[11px] font-bold text-white group-hover:text-[#d9ad3c]">Admin</span>
                </div>
                <div className="text-[10px] text-[#9e988f] truncate font-mono">Dean Vance</div>
              </button>

              {/* Faculty Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('faculty@cadence.edu', 'faculty')}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#141720] hover:bg-[#1b202c] border border-white/5 hover:border-[#2dd4bf]/50 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#2dd4bf]" />
                  <span className="text-[11px] font-bold text-white group-hover:text-[#2dd4bf]">Faculty</span>
                </div>
                <div className="text-[10px] text-[#9e988f] truncate font-mono">Dr. Vandenberg</div>
              </button>

              {/* Student Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('student@cadence.edu', 'student')}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#141720] hover:bg-[#1b202c] border border-white/5 hover:border-emerald-400/50 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold text-white group-hover:text-emerald-400">Student</span>
                </div>
                <div className="text-[10px] text-[#9e988f] truncate font-mono">Arjun Mehta</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] font-mono text-[#6b6660]">
          Secured with Bcrypt &amp; HMAC-SHA256 • Serverless Edge Session Cookies
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08090b] flex items-center justify-center text-xs font-mono text-[#9e988f]">Loading Cadence Authentication...</div>}>
      <LoginContent />
    </Suspense>
  );
}
