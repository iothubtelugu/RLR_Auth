'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Building,
  Clock,
  Fingerprint,
  Shield,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'attendance' | 'device' | 'security' | 'backup'>('general');
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveMessage(null);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setSaveMessage('System settings successfully saved and applied.');
        setTimeout(() => setSaveMessage(null), 3500);
      } else {
        setSaveMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setSaveMessage(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Database successfully reset and reseeded with realistic demo data.');
        setResetModalOpen(false);
        fetchSettings();
      } else {
        alert(`Reset error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const handleExportDatabaseJson = async () => {
    try {
      const res = await fetch('/api/members?limit=1000');
      const membersData = await res.json();
      const attRes = await fetch('/api/attendance?limit=1000');
      const attData = await attRes.json();

      const dump = {
        exportedAt: new Date().toISOString(),
        settings,
        members: membersData.data,
        attendanceEvents: attData.data,
      };

      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RLR_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  return (
    <AppShell pageTitle="Robotics Lab System Settings">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-[#E2EAF2] pb-3">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'general'
              ? 'bg-[#073B8C] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#073B8C] bg-white border border-[#E2EAF2]'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>General & Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'attendance'
              ? 'bg-[#073B8C] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#073B8C] bg-white border border-[#E2EAF2]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Attendance Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('device')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'device'
              ? 'bg-[#073B8C] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#073B8C] bg-white border border-[#E2EAF2]'
          }`}
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span>Biometric Integration</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'security'
              ? 'bg-[#073B8C] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#073B8C] bg-white border border-[#E2EAF2]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Roles</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'backup'
              ? 'bg-[#073B8C] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#073B8C] bg-white border border-[#E2EAF2]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Backup & Data Reset</span>
        </button>
      </div>

      {saveMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold mb-6 flex items-center gap-2 ${saveMessage.startsWith('Error') ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Settings Forms */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2EAF2] shadow-subtle max-w-3xl">
        {/* TAB 1: GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#172B4D] pb-2 border-b border-[#E2EAF2]">
              Laboratory & Institution Identity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Laboratory Name</label>
                <input
                  type="text"
                  value={settings.lab_name || ''}
                  onChange={(e) => setSettings({ ...settings, lab_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] focus:outline-none focus:border-[#1677C8]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Organization / University</label>
                <input
                  type="text"
                  value={settings.organization_name || ''}
                  onChange={(e) => setSettings({ ...settings, organization_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] focus:outline-none focus:border-[#1677C8]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#172B4D] mb-1">Campus / Building Location</label>
              <input
                type="text"
                value={settings.campus_location || ''}
                onChange={(e) => setSettings({ ...settings, campus_location: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] focus:outline-none focus:border-[#1677C8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Default Timezone</label>
                <input
                  type="text"
                  disabled
                  value="Asia/Kolkata (IST)"
                  className="w-full p-2.5 rounded-xl border border-[#E2EAF2] bg-slate-100 text-[#64748B] font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Current Academic Year</label>
                <input
                  type="text"
                  value={settings.academic_year || '2024-2025'}
                  onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] focus:outline-none focus:border-[#1677C8]"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white font-bold"
              >
                <Save className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>{saving ? 'Saving...' : 'Save General Settings'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ATTENDANCE RULES */}
        {activeTab === 'attendance' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#172B4D] pb-2 border-b border-[#E2EAF2]">
              Attendance Transition & Cooldown Rules
            </h3>

            <div>
              <label className="block font-semibold text-[#172B4D] mb-1">
                Duplicate-Scan Cooldown (Seconds)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.duplicate_cooldown_seconds || 15}
                onChange={(e) => setSettings({ ...settings, duplicate_cooldown_seconds: parseInt(e.target.value, 10) })}
                className="w-full max-w-xs p-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] focus:outline-none focus:border-[#1677C8]"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Scans within this duration from the same member are ignored to prevent accidental double-taps.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-[#172B4D] mb-1">
                Session Overnight Limit (Hours)
              </label>
              <input
                type="number"
                min="4"
                max="24"
                value={settings.session_overnight_hours_limit || 12}
                onChange={(e) => setSettings({ ...settings, session_overnight_hours_limit: parseInt(e.target.value, 10) })}
                className="w-full max-w-xs p-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] focus:outline-none focus:border-[#1677C8]"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Active sessions exceeding this limit are flagged for administrative verification.
              </p>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white font-bold"
              >
                <Save className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>{saving ? 'Saving...' : 'Save Attendance Rules'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: BIOMETRIC DEVICE SETTINGS */}
        {activeTab === 'device' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#172B4D] pb-2 border-b border-[#E2EAF2]">
              Biometric Hardware Bridge & Agent Settings
            </h3>

            <div>
              <label className="block font-semibold text-[#172B4D] mb-1">Active Operating Mode</label>
              <select
                value={settings.fingerprint_mode || 'demo'}
                onChange={(e) => setSettings({ ...settings, fingerprint_mode: e.target.value })}
                className="w-full max-w-xs p-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] focus:outline-none focus:border-[#1677C8]"
              >
                <option value="demo">Demo Mode (Simulated Biometric Adapter)</option>
                <option value="hardware">Hardware Mode (Local USB Agent Bridge)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#172B4D] mb-1">Local Hardware Agent URL</label>
              <input
                type="text"
                value={settings.hardware_agent_url || 'ws://localhost:8080/fingerprint'}
                onChange={(e) => setSettings({ ...settings, hardware_agent_url: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] focus:outline-none focus:border-[#1677C8]"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                WebSocket or HTTP address where the local fingerprint agent daemon runs on the kiosk terminal.
              </p>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white font-bold"
              >
                <Save className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>{saving ? 'Saving...' : 'Save Device Settings'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: SECURITY & ROLES */}
        {activeTab === 'security' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#172B4D] pb-2 border-b border-[#E2EAF2]">
              Role-Based Access Control (RBAC) Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F4FBFF] border-b border-[#E2EAF2] text-[11px] font-bold text-[#64748B]">
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Kiosk Scan</th>
                    <th className="py-2.5 px-3">View Occupancy</th>
                    <th className="py-2.5 px-3">Member CRUD</th>
                    <th className="py-2.5 px-3">Manual Exit</th>
                    <th className="py-2.5 px-3">Manage Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2EAF2]">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#073B8C]">ADMIN</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1677C8]">COORDINATOR</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                    <td className="py-2.5 px-3 text-slate-400">No</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#64748B]">OPERATOR</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Yes</td>
                    <td className="py-2.5 px-3 text-slate-400">No</td>
                    <td className="py-2.5 px-3 text-slate-400">No</td>
                    <td className="py-2.5 px-3 text-slate-400">No</td>
                    <td className="py-2.5 px-3 text-slate-400">No</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 mt-4">
              <p className="font-bold">Administrative Accounts</p>
              <p className="mt-0.5">
                Default accounts: <code>admin</code> (password: <code>admin123</code>), <code>coordinator</code> (password: <code>coord123</code>).
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: BACKUP & DATA RESET */}
        {activeTab === 'backup' && (
          <div className="space-y-6 text-xs">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D] pb-2 border-b border-[#E2EAF2]">
                Database Backup & Export
              </h3>
              <p className="text-[#64748B] mt-2 mb-3">
                Download a complete JSON database snapshot of registered members, attendance logs, and active sessions.
              </p>
              <button
                onClick={handleExportDatabaseJson}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white font-bold transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>Export Full Database Snapshot (JSON)</span>
              </button>
            </div>

            <div className="pt-4 border-t border-[#E2EAF2]">
              <h3 className="text-sm font-bold text-rose-700 pb-2 border-b border-rose-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reset & Reseed Demo Data</span>
              </h3>
              <p className="text-[#64748B] mt-2 mb-4">
                This will reset the database to clean realistic test members, sample attendance events, and active sessions. Historical events will be refreshed.
              </p>
              <button
                onClick={() => setResetModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset & Reseed Development Dataset</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Resetting */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-[#E2EAF2] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-rose-100 bg-rose-50 text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-bold">Confirm Database Reset</h3>
            </div>
            <div className="p-5 text-xs text-[#64748B] space-y-3">
              <p>
                Are you sure you want to reset the database? This will restore standard test members (Aarav, Priya, Rohit, etc.) and reset attendance logs.
              </p>
              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetData}
                  disabled={resetting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {resetting ? 'Resetting...' : 'Yes, Reset Database'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
