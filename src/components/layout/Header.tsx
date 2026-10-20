'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Fingerprint,
  Bell,
  LogOut,
  User,
  Shield,
  Sparkles,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  pageTitle: string;
  onMobileMenuToggle?: () => void;
  onOpenQuickScan?: () => void;
  deviceMode?: 'demo' | 'hardware';
  deviceOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  onMobileMenuToggle,
  onOpenQuickScan,
  deviceMode = 'demo',
  deviceOnline = true,
}) => {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Live Clock in Asia/Kolkata
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Formatter for Asia/Kolkata
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateStr = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setCurrentTime(timeStr);
      setCurrentDate(dateStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch logged in user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          // Default guest or fallback
          setCurrentUser({
            fullName: 'Lab Administrator',
            role: 'ADMIN',
            username: 'admin',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E2EAF2] sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg text-[#64748B] hover:text-[#073B8C] hover:bg-[#F4FBFF] md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">{pageTitle}</h1>
        </div>
      </div>

      {/* Right: Live Clock, Device Status, Quick Scan, User */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Live IST Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F4FBFF] border border-[#E2EAF2] text-xs text-[#172B4D]">
          <Clock className="w-3.5 h-3.5 text-[#1677C8]" />
          <span className="font-semibold">{currentTime}</span>
          <span className="text-[#94A3B8]">|</span>
          <span className="text-[#64748B]">{currentDate}</span>
          <span className="px-1 py-0.5 rounded bg-blue-100 text-[10px] font-bold text-[#073B8C]">IST</span>
        </div>

        {/* Biometric Device Status Pill */}
        <div className="flex items-center">
          {deviceMode === 'demo' ? (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
              title="Demo Mode: Simulated biometric hardware adapter. No physical reader required."
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <Fingerprint className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">DEMO ADAPTER</span>
            </div>
          ) : deviceOnline ? (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
              title="Physical fingerprint reader connected via local hardware agent."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">HARDWARE ONLINE</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
              title="Hardware Agent unreachable. Please start hardware-agent daemon."
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <Fingerprint className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">HARDWARE OFFLINE</span>
            </div>
          )}
        </div>

        {/* Quick Demo Scan Trigger */}
        {onOpenQuickScan && (
          <button
            onClick={onOpenQuickScan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00A9E8]/10 hover:bg-[#00A9E8]/20 text-[#073B8C] text-xs font-semibold border border-[#00A9E8]/30 transition shadow-sm"
            title="Trigger a test scan for any member"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00A9E8]" />
            <span className="hidden sm:inline">Simulate Scan</span>
          </button>
        )}

        {/* User Profile & Menu */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-[#F4FBFF] border border-transparent hover:border-[#E2EAF2] transition"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {currentUser?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[#172B4D] leading-tight">
                {currentUser?.fullName || 'Administrator'}
              </span>
              <span className="text-[10px] font-semibold text-[#00A9E8] leading-tight">
                {currentUser?.role || 'ADMIN'}
              </span>
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-elevated border border-[#E2EAF2] py-1.5 z-40">
              <div className="px-3 py-2 border-b border-[#E2EAF2]">
                <p className="text-xs font-bold text-[#172B4D]">{currentUser?.fullName}</p>
                <p className="text-[11px] text-[#64748B] truncate">{currentUser?.email || currentUser?.username}</p>
                <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EBF3FF] text-[#073B8C]">
                  Role: {currentUser?.role}
                </span>
              </div>
              <button
                onClick={() => {
                  setUserDropdownOpen(false);
                  router.push('/settings');
                }}
                className="w-full text-left px-3 py-2 text-xs text-[#172B4D] hover:bg-[#F4FBFF] flex items-center gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-[#64748B]" />
                System Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
