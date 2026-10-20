'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bot, Lock, User, ArrowRight, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (data.success) {
        router.push('/');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const setQuickCreds = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#F4FBFF] flex flex-col justify-between p-4 sm:p-8 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#073B8C] to-[#1677C8] flex items-center justify-center text-white shadow-sm">
            <Bot className="w-6 h-6 text-[#FFD21C]" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-[#073B8C] leading-none">
              ROBOTICS LAB OF RKV
            </h1>
            <p className="text-[11px] font-semibold text-[#00A9E8] tracking-widest mt-0.5">
              SMART ACCESS MANAGEMENT
            </p>
          </div>
        </div>

        <Link
          href="/kiosk"
          className="text-xs font-bold text-[#073B8C] bg-white border border-[#E2EAF2] hover:bg-[#F4FBFF] px-3.5 py-1.5 rounded-xl transition shadow-subtle flex items-center gap-1.5"
        >
          <span>Open Entrance Kiosk</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#00A9E8]" />
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-white rounded-3xl p-8 border border-[#E2EAF2] shadow-elevated">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF3FF] text-[#073B8C] flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6 text-[#1677C8]" />
            </div>
            <h2 className="text-xl font-black text-[#172B4D] tracking-tight">Staff & Admin Sign In</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Enter your authorized lab credentials to access management controls.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#172B4D] mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or coordinator"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#172B4D] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4 text-[#FFD21C]" />
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-6 pt-5 border-t border-[#E2EAF2] text-xs">
            <div className="flex items-center gap-1.5 text-[#64748B] mb-2 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#00A9E8]" />
              <span>Quick Demo Access (Click to autofill):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQuickCreds('admin', 'admin123')}
                className="px-2.5 py-1 rounded-lg bg-[#F4FBFF] hover:bg-blue-50 border border-[#E2EAF2] text-[#073B8C] font-semibold text-[11px] transition"
              >
                Administrator
              </button>
              <button
                type="button"
                onClick={() => setQuickCreds('coordinator', 'coord123')}
                className="px-2.5 py-1 rounded-lg bg-[#F4FBFF] hover:bg-blue-50 border border-[#E2EAF2] text-[#1677C8] font-semibold text-[11px] transition"
              >
                Lab Coordinator
              </button>
              <button
                type="button"
                onClick={() => setQuickCreds('operator', 'operator123')}
                className="px-2.5 py-1 rounded-lg bg-[#F4FBFF] hover:bg-blue-50 border border-[#E2EAF2] text-[#64748B] font-semibold text-[11px] transition"
              >
                Kiosk Operator
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-[#64748B] max-w-5xl mx-auto w-full">
        <p>Robotics Lab of RKV (RLR) • RGUKT RK Valley • Smart Biometric Lab Attendance System</p>
      </footer>
    </div>
  );
}
