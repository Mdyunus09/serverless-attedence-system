'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseStatus } from '@/lib/types';
import { Database, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ShieldCheck, Zap, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

export default function NeonModal({ isOpen, onClose, onStatusChange }: Props) {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [connectionStringInput, setConnectionStringInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db');
      const data = await res.json();
      setStatus(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setFeedback(null);
    }
  }, [isOpen]);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: passwordInput.trim() || undefined,
          connectionString: connectionStringInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `${data.message} (${data.latencyMs}ms)` });
        await fetchStatus();
        if (onStatusChange) onStatusChange();
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Connection attempt failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSchema = async () => {
    setInitLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/db', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'All 7 Neon database tables created and seeded successfully!' });
        await fetchStatus();
        if (onStatusChange) onStatusChange();
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Initialization failed' });
    } finally {
      setInitLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f1115] border border-white/10 rounded-xl shadow-2xl p-6 text-sm text-[#e2ded7]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Neon Cloud Database Integration</h2>
              <p className="text-xs text-[#9e988f]">PostgreSQL Serverless & Pooled Connection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[#9e988f] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className="mt-4 p-4 rounded-lg bg-[#14171d] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#9e988f]">Connection State</span>
            {status?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Neon Connected ({status.latencyMs}ms)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Operational Storage (Awaiting Password)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-black/40 border border-white/5">
              <span className="text-[#9e988f] block text-[10px] uppercase">Host</span>
              <span className="text-white truncate block">ep-bold-silence-b3bw8hxt-pooler...</span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-white/5">
              <span className="text-[#9e988f] block text-[10px] uppercase">Database / User</span>
              <span className="text-white">neondb / neondb_owner</span>
            </div>
          </div>

          <p className="text-xs text-[#9e988f] leading-relaxed">
            {status?.message}
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{feedback.message}</div>
          </div>
        )}

        {/* Connect Form */}
        <form onSubmit={handleTestAndSave} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">
              Paste Neon Password (or full connection string from Neon dashboard)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="w-4 h-4 text-[#9e988f] absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Paste password from 'Show password' in Neon"
                  className="w-full pl-9 pr-3 py-2 bg-[#14171d] border border-white/10 rounded-lg text-xs text-white placeholder-[#6b6660] focus:outline-none focus:border-[#d9ad3c]"
                />
              </div>
              <button
                type="submit"
                disabled={loading || (!passwordInput && !connectionStringInput)}
                className="px-4 py-2 rounded-lg bg-[#d9ad3c] hover:bg-[#e6bd4b] text-black font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Connect Neon
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[#9e988f]">
              In your Neon screenshot, click <strong>&quot;Show password&quot;</strong> and paste the password here or in <code className="text-[#d9ad3c]">.env.local</code>.
            </p>
          </div>
        </form>

        {/* Actions & Seed */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleInitializeSchema}
            disabled={initLoading}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {initLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#2dd4bf]" />}
            Initialize &amp; Seed Neon Tables
          </button>

          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="px-3 py-2 text-xs text-[#9e988f] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Ping
          </button>
        </div>
      </div>
    </div>
  );
}

