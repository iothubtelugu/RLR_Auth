'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Fingerprint,
  Bot,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Sliders,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { formatTimeIST, formatDateIST, formatDurationElapsed } from '@/lib/utils/timezone';

export default function KioskPage() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [occupancyCount, setOccupancyCount] = useState<number>(0);
  const [deviceInfo, setDeviceInfo] = useState<any>({ mode: 'demo', connected: true });
  const [scannerState, setScannerState] = useState<
    'READY' | 'DETECTED' | 'VERIFYING' | 'SUCCESS_ENTRY' | 'SUCCESS_EXIT' | 'FAILED' | 'COOLDOWN' | 'DISCONNECTED'
  >('READY');

  const [scanResult, setScanResult] = useState<any>(null);
  const [lastScanSuccess, setLastScanSuccess] = useState<any>(null);

  // Quick Demo Drawer
  const [demoDrawerOpen, setDemoDrawerOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Occupancy & Device
  const fetchStatus = async () => {
    try {
      const occRes = await fetch('/api/occupancy');
      const occData = await occRes.json();
      if (occData.success) {
        setOccupancyCount(occData.count);
      }

      const devRes = await fetch('/api/devices');
      const devData = await devRes.json();
      if (devData.success) {
        setDeviceInfo({
          mode: devData.currentMode || 'demo',
          connected: devData.activeStatus?.connected ?? true,
          deviceName: devData.activeStatus?.deviceName,
        });
      }
    } catch {}
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members?limit=30');
      const data = await res.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    fetchMembers();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  // Execute Scan
  const triggerScan = async (params: { memberId?: string; credentialRef?: string }) => {
    try {
      setScannerState('DETECTED');
      setTimeout(() => setScannerState('VERIFYING'), 300);

      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: params.memberId,
          credentialReference: params.credentialRef,
          verificationSource: deviceInfo.mode === 'hardware' ? 'FINGERPRINT_HARDWARE' : 'FINGERPRINT_DEMO',
        }),
      });

      const data = await res.json();
      setScanResult(data);

      if (data.success) {
        if (data.action === 'ENTRY') {
          setScannerState('SUCCESS_ENTRY');
        } else {
          setScannerState('SUCCESS_EXIT');
        }
        setLastScanSuccess(data);
        fetchStatus();
        fetchMembers();

        // Reset back to READY after 5 seconds
        setTimeout(() => {
          setScannerState('READY');
          setScanResult(null);
        }, 5000);
      } else if (data.cooldownActive) {
        setScannerState('COOLDOWN');
        setTimeout(() => {
          setScannerState('READY');
          setScanResult(null);
        }, 3500);
      } else {
        setScannerState('FAILED');
        setTimeout(() => {
          setScannerState('READY');
          setScanResult(null);
        }, 4000);
      }
    } catch (err: any) {
      setScannerState('FAILED');
      setScanResult({ success: false, message: err.message || 'Scanner communication failed' });
      setTimeout(() => {
        setScannerState('READY');
        setScanResult(null);
      }, 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FBFF] flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Background Tech Glow Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#00A9E8]/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      {/* TOP HEADER */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#E2EAF2] bg-white/80 backdrop-blur-md relative z-10">
        {/* Lab Branding */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#073B8C] to-[#1677C8] flex items-center justify-center text-white shadow-md">
            <Bot className="w-7 h-7 text-[#FFD21C]" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#073B8C] tracking-tight leading-none">
              ROBOTICS LAB OF RKV
            </h1>
            <p className="text-xs font-semibold text-[#00A9E8] tracking-widest mt-0.5">
              SMART ACCESS KIOSK
            </p>
          </div>
        </div>

        {/* Live IST Clock & Date */}
        <div className="flex flex-col items-center">
          <div className="text-2xl font-black tracking-tight text-[#172B4D] font-mono">
            {currentTime || '00:00:00 AM'}
          </div>
          <div className="text-xs font-medium text-[#64748B]">
            {currentDate} <span className="px-1 py-0.2 rounded bg-blue-100 text-[10px] font-bold text-[#073B8C]">IST</span>
          </div>
        </div>

        {/* Right Status Badges & Dashboard Link */}
        <div className="flex items-center gap-3">
          {/* Occupancy Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#073B8C] to-[#1677C8] text-white shadow-sm">
            <Users className="w-4 h-4 text-[#FFD21C]" />
            <div className="text-xs">
              <span className="font-semibold text-white/80">Inside: </span>
              <span className="font-black text-sm">{occupancyCount}</span>
            </div>
          </div>

          {/* Mode Pill */}
          {deviceInfo.mode === 'demo' ? (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>DEMO MODE</span>
            </div>
          ) : deviceInfo.connected ? (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>HARDWARE READY</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>DISCONNECTED</span>
            </div>
          )}

          {/* Theme Selector */}
          <ThemeSelector />

          {/* Return to Admin Dashboard */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172B4D] text-xs font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Dashboard</span>
          </Link>
        </div>
      </header>

      {/* DEMO MODE NOTICE BANNER */}
      {deviceInfo.mode === 'demo' && (
        <div className="bg-amber-100/80 border-b border-amber-200 px-4 py-1.5 text-center text-xs font-semibold text-amber-900 flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>DEMO SIMULATION ACTIVE: Virtual biometric adapter connected. Use the simulation drawer below to test scans.</span>
        </div>
      )}

      {/* MAIN KIOSK SCANNING AREA */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 relative z-10 max-w-2xl mx-auto w-full text-center">
        {/* STATE 1: SCANNER READY */}
        {scannerState === 'READY' && (
          <div className="flex flex-col items-center animate-in fade-in duration-300">
            {/* Interactive Fingerprint Scanner Graphic */}
            <div
              onClick={() => {
                // If demo mode, select first member or trigger
                if (members.length > 0) {
                  triggerScan({ memberId: members[0].id, credentialRef: members[0].credential_reference });
                }
              }}
              className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-white border-2 border-[#00A9E8] shadow-elevated flex items-center justify-center relative cursor-pointer group hover:scale-105 transition-all duration-300 scanner-active-pulse"
              title="Click to trigger biometric scan"
            >
              {/* Laser scanning beam line */}
              <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-[#00A9E8] to-transparent shadow-[0_0_8px_#00A9E8] scanner-laser-beam pointer-events-none rounded-full"></div>

              <Fingerprint className="w-24 h-24 sm:w-28 sm:h-28 text-[#073B8C] group-hover:text-[#00A9E8] transition-colors" />

              <span className="absolute bottom-3 text-[10px] font-bold text-[#00A9E8] uppercase tracking-wider">
                Touch to Scan
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-[#172B4D] mt-6 tracking-tight">
              Place Registered Finger on Scanner
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-md mt-1.5">
              Hold your finger steady on the optical reader. Your entry or exit will be automatically verified.
            </p>

            {/* Last Successful Scan Pill */}
            {lastScanSuccess && (
              <div className="mt-6 px-4 py-2 rounded-2xl bg-white border border-[#E2EAF2] shadow-subtle flex items-center gap-2 text-xs text-[#172B4D]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Last scan: <strong className="font-bold">{lastScanSuccess.member?.fullName}</strong> (
                  {lastScanSuccess.action}) at {formatTimeIST(lastScanSuccess.event?.timestamp)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* STATE 2: DETECTED / VERIFYING */}
        {(scannerState === 'DETECTED' || scannerState === 'VERIFYING') && (
          <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-white border-2 border-[#FFD21C] shadow-elevated flex items-center justify-center relative">
              <RefreshCw className="w-20 h-20 text-[#1677C8] animate-spin" />
            </div>
            <h2 className="text-xl font-black text-[#172B4D] mt-6 tracking-tight">
              {scannerState === 'DETECTED' ? 'Fingerprint Detected...' : 'Verifying Identity in Database...'}
            </h2>
            <p className="text-xs text-[#64748B] mt-1">Comparing minutiae templates...</p>
          </div>
        )}

        {/* STATE 3: SUCCESS ENTRY */}
        {scannerState === 'SUCCESS_ENTRY' && scanResult?.member && (
          <div className="w-full bg-white rounded-3xl border-2 border-emerald-500 shadow-elevated p-8 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white tracking-wider uppercase mb-2">
              ENTRY RECORDED
            </div>

            <h2 className="text-2xl font-black text-[#172B4D]">
              Welcome, {scanResult.member.fullName}!
            </h2>
            <p className="text-sm font-semibold text-[#00A9E8] mt-0.5">
              {scanResult.member.department} • {scanResult.member.category}
            </p>
            <p className="text-xs font-mono text-[#64748B] mt-1">ID: {scanResult.member.id}</p>

            <div className="mt-6 pt-4 border-t border-[#E2EAF2] w-full flex items-center justify-around text-xs text-[#64748B]">
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8]">Date</span>
                <span className="font-bold text-[#172B4D]">{formatDateIST(scanResult.event?.timestamp)}</span>
              </div>
              <div className="h-6 w-px bg-[#E2EAF2]"></div>
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8]">Entry Time</span>
                <span className="font-bold text-[#172B4D]">{formatTimeIST(scanResult.event?.timestamp)}</span>
              </div>
              <div className="h-6 w-px bg-[#E2EAF2]"></div>
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8]">Source</span>
                <span className="font-bold text-emerald-700">{scanResult.event?.verification_source}</span>
              </div>
            </div>
          </div>
        )}

        {/* STATE 4: SUCCESS EXIT */}
        {scannerState === 'SUCCESS_EXIT' && scanResult?.member && (
          <div className="w-full bg-white rounded-3xl border-2 border-[#1677C8] shadow-elevated p-8 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-blue-100 text-[#1677C8] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full text-xs font-black bg-[#1677C8] text-white tracking-wider uppercase mb-2">
              EXIT RECORDED
            </div>

            <h2 className="text-2xl font-black text-[#172B4D]">
              Goodbye, {scanResult.member.fullName}!
            </h2>
            <p className="text-sm font-semibold text-[#00A9E8] mt-0.5">
              {scanResult.member.department} • {scanResult.member.category}
            </p>
            <p className="text-xs font-mono text-[#64748B] mt-1">ID: {scanResult.member.id}</p>

            <div className="mt-6 pt-4 border-t border-[#E2EAF2] w-full flex items-center justify-around text-xs text-[#64748B]">
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8]">Exit Time</span>
                <span className="font-bold text-[#172B4D]">{formatTimeIST(scanResult.event?.timestamp)}</span>
              </div>
              <div className="h-6 w-px bg-[#E2EAF2]"></div>
              <div>
                <span className="block text-[10px] uppercase font-semibold text-[#94A3B8]">Lab Session</span>
                <span className="font-bold text-blue-700">
                  {scanResult.session?.duration_minutes ? `${scanResult.session.duration_minutes} mins` : 'Completed'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STATE 5: COOLDOWN WARNING */}
        {scannerState === 'COOLDOWN' && (
          <div className="w-full bg-white rounded-3xl border-2 border-amber-500 shadow-elevated p-8 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <Clock className="w-12 h-12" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-600 text-white tracking-wider uppercase mb-2">
              SCAN IGNORED • COOLDOWN ACTIVE
            </div>
            <h2 className="text-xl font-bold text-[#172B4D]">{scanResult?.message}</h2>
            <p className="text-xs text-[#64748B] mt-2 max-w-sm">
              Repeated scans within 15 seconds are safely suppressed to prevent duplicate entry/exit records.
            </p>
          </div>
        )}

        {/* STATE 6: FAILED / DENIED */}
        {scannerState === 'FAILED' && (
          <div className="w-full bg-white rounded-3xl border-2 border-rose-500 shadow-elevated p-8 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <XCircle className="w-12 h-12" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white tracking-wider uppercase mb-2">
              VERIFICATION FAILED
            </div>
            <h2 className="text-xl font-bold text-[#172B4D]">{scanResult?.message || 'Access Denied'}</h2>
            <p className="text-xs text-[#64748B] mt-2 max-w-sm">
              Please ensure your finger is clean and correctly placed, or contact the Robotics Lab coordinator.
            </p>
          </div>
        )}
      </main>

      {/* BOTTOM COLLAPSIBLE DEMO SCAN DRAWER */}
      <div className="bg-white border-t border-[#E2EAF2] shadow-elevated relative z-20">
        <button
          onClick={() => setDemoDrawerOpen(!demoDrawerOpen)}
          className="w-full py-2.5 px-6 flex items-center justify-between text-xs font-bold text-[#073B8C] hover:bg-[#F4FBFF] transition"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00A9E8]" />
            <span>Kiosk Quick Testing Drawer ({members.length} Enrolled Members)</span>
            <span className="text-[11px] font-normal text-[#64748B]">
              — Click any member to simulate an entrance scan
            </span>
          </div>
          {demoDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {demoDrawerOpen && (
          <div className="p-4 border-t border-[#E2EAF2] max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => triggerScan({ memberId: m.id, credentialRef: m.credential_reference })}
                  className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                    m.is_inside === 1
                      ? 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/60'
                      : 'border-[#E2EAF2] bg-[#F4FBFF]/40 hover:bg-[#F4FBFF]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#172B4D] truncate">{m.full_name}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        m.is_inside === 1 ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    ></span>
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-1 flex items-center justify-between">
                    <span>{m.department}</span>
                    <span className="font-semibold">{m.is_inside === 1 ? 'INSIDE' : 'OUT'}</span>
                  </div>
                </button>
              ))}

              {/* Edge Case: Unknown Finger */}
              <button
                onClick={() => triggerScan({ credentialRef: 'FP-UNREGISTERED-TOKEN' })}
                className="p-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/50 text-left transition text-rose-800"
              >
                <span className="font-bold text-xs block">Unknown Finger</span>
                <span className="text-[10px] text-rose-600">Simulate Rejection</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
