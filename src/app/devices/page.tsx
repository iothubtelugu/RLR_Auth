'use client';

import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  Terminal,
  Activity,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTimeIST, formatDateTimeIST } from '@/lib/utils/timezone';

export default function DevicesPage() {
  const [deviceData, setDeviceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [togglingMode, setTogglingMode] = useState(false);

  // Diagnostic Logs Console
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Biometric subsystem initialized.`,
    `[${new Date().toLocaleTimeString()}] Polling local hardware agent & virtual driver status...`,
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 40)]);
  };

  const fetchDeviceStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) {
        setDeviceData(data);
        addLog(`Status refreshed: Mode = ${data.currentMode?.toUpperCase()}`);
      }
    } catch (err: any) {
      addLog(`Error querying device status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceStatus();
  }, []);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      addLog('Initiating connectivity diagnostic probe...');
      const res = await fetch('/api/devices/status');
      const data = await res.json();
      setTestResult(data.test);
      if (data.test?.success) {
        addLog(`Diagnostic probe passed: ${data.test.message} (latency: ${data.test.latencyMs}ms)`);
      } else {
        addLog(`Diagnostic probe failed: ${data.test?.message || 'Unreachable'}`);
      }
    } catch (err: any) {
      addLog(`Probe exception: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleToggleMode = async (targetMode: 'demo' | 'hardware') => {
    try {
      setTogglingMode(true);
      addLog(`Switching biometric adapter mode to "${targetMode.toUpperCase()}"...`);

      const res = await fetch('/api/devices/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_MODE', mode: targetMode }),
      });

      const data = await res.json();
      if (data.success) {
        addLog(`Mode successfully set to ${targetMode.toUpperCase()}`);
        fetchDeviceStatus();
      } else {
        addLog(`Failed to change mode: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`Error setting mode: ${err.message}`);
    } finally {
      setTogglingMode(false);
    }
  };

  const currentMode = deviceData?.currentMode || 'demo';
  const activeStatus = deviceData?.activeStatus || {
    connected: true,
    isDemo: true,
    status: 'DEMO',
    deviceName: 'RLR Biometric Simulator (Virtual Adapter)',
    manufacturer: 'RLR Embedded Labs',
    model: 'Simulated Biometric Reader v1.0',
    connectionType: 'DEMO_ADAPTER',
    firmwareVersion: 'v1.0-simulated-demo',
  };

  return (
    <AppShell pageTitle="Biometric Fingerprint Hardware & Integration">
      {/* 1. Header Hero with Mode Switcher */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2EAF2] shadow-subtle mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#172B4D]">Biometric Device Management</h2>
            {currentMode === 'demo' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                DEMO MODE ACTIVE
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                HARDWARE AGENT MODE
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1 max-w-xl">
            Configure biometric hardware communication, test sensor latency, monitor driver connectivity, and switch between simulated demonstration and physical hardware scanner bridges.
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center gap-2 bg-[#F4FBFF] p-1.5 rounded-2xl border border-[#E2EAF2]">
          <button
            onClick={() => handleToggleMode('demo')}
            disabled={togglingMode || currentMode === 'demo'}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              currentMode === 'demo'
                ? 'bg-[#073B8C] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#073B8C]'
            }`}
          >
            Demo Mode (Simulator)
          </button>
          <button
            onClick={() => handleToggleMode('hardware')}
            disabled={togglingMode || currentMode === 'hardware'}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              currentMode === 'hardware'
                ? 'bg-[#073B8C] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#073B8C]'
            }`}
          >
            Physical Hardware Mode
          </button>
        </div>
      </div>

      {/* 2. Device Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Card 1: Active Biometric Adapter */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2EAF2] shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E2EAF2] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#073B8C] flex items-center justify-center">
                  <Fingerprint className="w-6 h-6 text-[#1677C8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172B4D]">{activeStatus.deviceName}</h3>
                  <p className="text-xs text-[#64748B]">
                    {activeStatus.manufacturer} • {activeStatus.model}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  activeStatus.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {activeStatus.connected ? '● CONNECTED' : '○ DISCONNECTED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F4FBFF] border border-[#E2EAF2]">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Connection Interface</span>
                <span className="font-semibold text-[#172B4D] mt-0.5 block">{activeStatus.connectionType}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F4FBFF] border border-[#E2EAF2]">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Firmware / Driver Version</span>
                <span className="font-semibold text-[#172B4D] mt-0.5 block">
                  {activeStatus.firmwareVersion || 'Native Driver'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F4FBFF] border border-[#E2EAF2]">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Last Successful Scan</span>
                <span className="font-semibold text-[#172B4D] mt-0.5 block">
                  {activeStatus.lastSuccessfulScan ? formatDateTimeIST(activeStatus.lastSuccessfulScan) : 'Ready'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F4FBFF] border border-[#E2EAF2]">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block">Heartbeat Status</span>
                <span className="font-semibold text-emerald-600 mt-0.5 block">Active (Online)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2EAF2] mt-5 flex items-center justify-between">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white text-xs font-bold transition disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-[#FFD21C]" />
              <span>{testing ? 'Testing...' : 'Test Device Connection'}</span>
            </button>
            <button
              onClick={fetchDeviceStatus}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2EAF2] bg-white hover:bg-slate-50 text-xs font-medium text-[#64748B]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Check Status</span>
            </button>
          </div>
        </div>

        {/* Card 2: Hardware Agent & Driver Capabilities */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2EAF2] shadow-subtle flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-[#E2EAF2] mb-4">
              <h3 className="text-sm font-bold text-[#172B4D]">Biometric Subsystem Capabilities</h3>
              <p className="text-xs text-[#64748B]">Supported verification workflows & local driver bridge</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl border border-[#E2EAF2] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-[#172B4D]">1:N Biometric Identification</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Supported
                </span>
              </div>

              <div className="p-3 rounded-xl border border-[#E2EAF2] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-[#172B4D]">Multi-Touch Guided Enrollment (3 Touches)</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Supported
                </span>
              </div>

              <div className="p-3 rounded-xl border border-[#E2EAF2] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-[#172B4D]">Opaque Minutiae Token Isolation</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="p-3 rounded-xl border border-[#E2EAF2] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-[#172B4D]">Duplicate Scan Cooldown Protection</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  15 Seconds
                </span>
              </div>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs mt-4 flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Non-Sensitive Diagnostics Live Console */}
      <div className="bg-[#172B4D] text-white rounded-2xl p-5 shadow-elevated border border-slate-700">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00A9E8]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Biometric Diagnostic Console
            </span>
          </div>
          <button
            onClick={() => setLogs([`[${new Date().toLocaleTimeString()}] Console cleared.`])}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            Clear Log
          </button>
        </div>

        <div className="font-mono text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto pr-2">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              <span className="text-[#00A9E8]">&gt;</span> {log}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
