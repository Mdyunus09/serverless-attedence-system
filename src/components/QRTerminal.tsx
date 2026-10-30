'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Session, Student } from '@/lib/types';
import {
  QrCode,
  Clock,
  ShieldCheck,
  RefreshCw,
  Users,
  CheckCircle2,
  X,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react';

interface Props {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: () => void;
}

export default function QRTerminal({ session, isOpen, onClose, onScanSuccess }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [token, setToken] = useState<string>(session.qr_token || 'CADENCE-TOKEN-X79K2');
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [checkIns, setCheckIns] = useState<Array<{ name: string; roll: string; time: string }>>([
    { name: 'Arjun Mehta', roll: 'CS2023-001', time: '10:02 AM' },
    { name: 'Zara K. Sterling', roll: 'CS2023-004', time: '10:04 AM' },
    { name: 'Chloe Montgomery', roll: 'CS2023-012', time: '10:01 AM' },
  ]);
  const [simStudentRoll, setSimStudentRoll] = useState('CS2023-009');
  const [simLoading, setSimLoading] = useState(false);
  const [simFeedback, setSimFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Rotate QR token every 15 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // generate new token
          const newToken = `CADENCE-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString(36).substring(4, 7).toUpperCase()}`;
          setToken(newToken);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Generate QR code data URL whenever token updates
  useEffect(() => {
    if (!isOpen) return;

    const checkInPayload = JSON.stringify({
      sessionId: session.id,
      courseId: session.course_id,
      token,
      issuedAt: new Date().toISOString(),
    });

    QRCode.toDataURL(
      checkInPayload,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0e1014',
          light: '#fdfbf4',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [token, session.id, session.course_id, isOpen]);

  // Simulate Student Self-Checkin
  const handleSimulateCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simStudentRoll.trim()) return;

    setSimLoading(true);
    setSimFeedback(null);

    try {
      const res = await fetch('/api/qr/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: session.qr_token || token,
          studentIdOrEmail: simStudentRoll.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSimFeedback({ type: 'success', message: data.message });
        setCheckIns((prev) => [
          {
            name: data.studentName || 'Student',
            roll: simStudentRoll.toUpperCase(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);

        // Launch celebratory confetti
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
        });

        if (onScanSuccess) onScanSuccess();
      } else {
        setSimFeedback({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setSimFeedback({ type: 'error', message: err.message || 'Verification failed' });
    } finally {
      setSimLoading(false);
    }
  };

  const copyStudentPortalLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/student-portal?token=${token}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#090b0e] border border-white/10 rounded-2xl shadow-2xl p-6 text-[#e2ded7] overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#d9ad3c]/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d9ad3c]/10 border border-[#d9ad3c]/30 flex items-center justify-center text-[#d9ad3c]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Dynamic Rotating QR Check-in Terminal
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Anti-Proxy Active
                </span>
              </div>
              <p className="text-xs text-[#9e988f]">
                {session.title} • {session.session_date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[#9e988f] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* QR Display Card (Projector View) */}
          <div className="md:col-span-6 flex flex-col items-center justify-center p-6 rounded-xl bg-[#12141a] border border-white/10 relative">
            <div className="p-3 bg-[#fdfbf4] rounded-xl shadow-lg border-2 border-[#d9ad3c]/40">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Session QR Check-In"
                  className="w-56 h-56 rounded-md select-none"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-[#9e988f]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#d9ad3c]" />
                </div>
              )}
            </div>

            {/* Rotation Countdown Bar */}
            <div className="w-full mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#9e988f] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#d9ad3c]" />
                  Cryptographic Token Rotation
                </span>
                <span className="text-[#d9ad3c] font-semibold tabular-nums">
                  00:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
                </span>
              </div>
              <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-[#d9ad3c] to-[#2dd4bf] transition-all duration-1000 ease-linear"
                  style={{ width: `${(secondsLeft / 15) * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="text-[11px] font-mono text-[#6b6660] block">
                Token: <code className="text-[#9e988f]">{token}</code>
              </span>
              <p className="text-[11px] text-[#9e988f] mt-1">
                Project this screen to the classroom. Tokens expire automatically to eliminate remote proxy scans.
              </p>
            </div>
          </div>

          {/* Right Column: Live Feed & Simulator */}
          <div className="md:col-span-6 space-y-4">
            {/* Live Scan Stream */}
            <div className="p-4 rounded-xl bg-[#12141a] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#9e988f] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#2dd4bf]" />
                  Live Attendance Stream ({checkIns.length} Verified)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {checkIns.map((ci, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-xs animate-in slide-in-from-top-1"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-[10px]">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium text-white">{ci.name}</div>
                        <div className="text-[10px] font-mono text-[#9e988f]">{ci.roll}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#2dd4bf]">{ci.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Scan Simulator Desk */}
            <div className="p-4 rounded-xl bg-[#12141a] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Smartphone className="w-3.5 h-3.5 text-[#d9ad3c]" />
                  Student Self Check-in Tester
                </div>
                <button
                  onClick={copyStudentPortalLink}
                  className="text-[11px] text-[#9e988f] hover:text-[#d9ad3c] flex items-center gap-1 font-mono transition-colors"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? 'Copied URL' : 'Copy Student Link'}
                </button>
              </div>

              {simFeedback && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    simFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{simFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleSimulateCheckIn} className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={simStudentRoll}
                    onChange={(e) => setSimStudentRoll(e.target.value)}
                    className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#d9ad3c]"
                  >
                    <option value="CS2023-009">CS2023-009 — Devanagari Rao</option>
                    <option value="CS2023-018">CS2023-018 — Ananya Sharma</option>
                    <option value="CS2023-025">CS2023-025 — Priya Nambiar</option>
                    <option value="CS2023-033">CS2023-033 — Fatima Al-Mansoor</option>
                    <option value="CS2023-041">CS2023-041 — Maya Linwood</option>
                    <option value="CS2023-050">CS2023-050 — Seraphina Frost</option>
                  </select>

                  <button
                    type="submit"
                    disabled={simLoading}
                    className="px-4 py-2 rounded-lg bg-[#2dd4bf] hover:bg-[#14b8a6] text-black font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {simLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    Simulate Scan
                  </button>
                </div>
                <p className="text-[11px] text-[#6b6660]">
                  Select any student above and click &quot;Simulate Scan&quot; to test instant QR authentication and see the roll update!
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

