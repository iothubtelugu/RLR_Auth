'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  LogOut,
  Clock,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatTimeIST, formatDateIST, formatDurationElapsed } from '@/lib/utils/timezone';

export default function CurrentlyInsidePage() {
  const [occupants, setOccupants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Manual Exit Modal State
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [manualReason, setManualReason] = useState('');
  const [submittingExit, setSubmittingExit] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchOccupancy = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentFilter) params.append('department', departmentFilter);
      if (academicYearFilter) params.append('academicYear', academicYearFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      params.append('sort', sortOrder);

      const res = await fetch(`/api/occupancy?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOccupants(data.occupants);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOccupancy();
    // Live update interval
    const interval = setInterval(fetchOccupancy, 8000);
    return () => clearInterval(interval);
  }, [search, departmentFilter, academicYearFilter, categoryFilter, sortOrder]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (departmentFilter) params.append('department', departmentFilter);
    if (academicYearFilter) params.append('academicYear', academicYearFilter);
    if (categoryFilter) params.append('category', categoryFilter);
    params.append('format', 'csv');
    window.location.href = `/api/occupancy?${params.toString()}`;
  };

  const handleOpenManualExit = (member: any) => {
    setSelectedMember(member);
    setManualReason('');
    setActionMessage(null);
    setExitModalOpen(true);
  };

  const handleConfirmManualExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !manualReason.trim()) return;

    try {
      setSubmittingExit(true);
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.id,
          action: 'FORCE_EXIT',
          reason: manualReason.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(`Manual exit recorded for ${selectedMember.full_name}`);
        setTimeout(() => {
          setExitModalOpen(false);
          setSelectedMember(null);
          setActionMessage(null);
          fetchOccupancy();
        }, 1200);
      } else {
        setActionMessage(`Error: ${data.error || 'Failed to record manual exit'}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setSubmittingExit(false);
    }
  };

  return (
    <AppShell pageTitle="Currently Inside Laboratory">
      {/* 1. Hero Occupancy Summary Banner */}
      <div className="bg-gradient-to-r from-[#073B8C] via-[#1677C8] to-[#00A9E8] rounded-2xl p-6 text-white shadow-card mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/20">
            <Users className="w-8 h-8 text-[#FFD21C]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD21C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FFD21C]"></span>
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Currently Inside: {occupants.length} Members
              </h2>
            </div>
            <p className="text-xs text-white/80 mt-1">
              Active laboratory presence automatically updated via verified entry and exit scans.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOccupancy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-semibold text-white transition backdrop-blur-sm"
            title="Refresh presence list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#073B8C] text-xs font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#073B8C]" />
            <span>Export Present to CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search by member name, ID, or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs focus:outline-none focus:border-[#1677C8]"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
          >
            <option value="">All Departments</option>
            <option value="ECE">ECE</option>
            <option value="CSE">CSE</option>
            <option value="Mechanical">Mechanical</option>
            <option value="EEE">EEE</option>
            <option value="Robotics Club">Robotics Club</option>
          </select>

          <select
            value={academicYearFilter}
            onChange={(e) => setAcademicYearFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
          >
            <option value="">All Academic Years</option>
            <option value="Year 1">Year 1</option>
            <option value="Year 2">Year 2</option>
            <option value="Year 3">Year 3</option>
            <option value="Year 4">Year 4</option>
            <option value="Faculty">Faculty</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
          >
            <option value="">All Categories</option>
            <option value="Student Member">Student Member</option>
            <option value="Robotics Lab Coordinator">Lab Coordinator</option>
            <option value="Club Core Team">Club Core Team</option>
            <option value="Faculty Supervisor">Faculty</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs font-medium text-[#172B4D] hover:bg-slate-100 transition"
            title="Toggle sort order by entry time"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#1677C8]" />
            <span>Sort: {sortOrder === 'ASC' ? 'Earliest' : 'Latest'}</span>
          </button>
        </div>
      </div>

      {/* 3. Occupants Table */}
      <div className="bg-white rounded-2xl border border-[#E2EAF2] shadow-subtle overflow-hidden">
        {occupants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4FBFF] border-b border-[#E2EAF2] text-[#64748B] uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Member ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Entry Time (IST)</th>
                  <th className="py-3 px-4">Time Spent Inside</th>
                  <th className="py-3 px-4">Verification Source</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EAF2]">
                {occupants.map((occ) => (
                  <tr key={occ.id} className="hover:bg-[#F4FBFF]/70 transition">
                    {/* Member */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                          {occ.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#172B4D]">{occ.full_name}</p>
                          <p className="text-[11px] text-[#64748B]">{occ.roll_number || 'Roll: N/A'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Member ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-[#073B8C]">{occ.id}</td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-[#172B4D] font-medium">{occ.department}</td>

                    {/* Academic Year */}
                    <td className="py-3.5 px-4 text-[#64748B]">{occ.academic_year}</td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <StatusBadge type="category" value={occ.category} />
                    </td>

                    {/* Entry Time */}
                    <td className="py-3.5 px-4 font-medium text-[#172B4D]">
                      {formatTimeIST(occ.last_entry_time)}
                    </td>

                    {/* Time Spent Inside */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDurationElapsed(occ.last_entry_time)}
                      </span>
                    </td>

                    {/* Verification Source */}
                    <td className="py-3.5 px-4">
                      <StatusBadge type="source" value={occ.verification_source || 'FINGERPRINT_HARDWARE'} />
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenManualExit(occ)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                        title="Record an administrative manual exit"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Manual Exit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="The Laboratory is Currently Empty"
            description="No members are recorded as currently inside. When members scan their fingerprint at the entrance kiosk, their live presence will appear here."
            actionLabel="Simulate an Entry Scan"
            onAction={() => {}}
          />
        )}
      </div>

      {/* 4. Manual Exit Modal with Audit Reason */}
      {exitModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-[#E2EAF2] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E2EAF2] bg-[#F4FBFF]">
              <h3 className="text-base font-bold text-[#172B4D]">Record Manual Exit</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Administrative attendance session correction for missing exit scan.
              </p>
            </div>

            <form onSubmit={handleConfirmManualExit} className="p-5 space-y-4 text-xs">
              {actionMessage && (
                <div className={`p-3 rounded-xl border text-xs ${actionMessage.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                  {actionMessage}
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-[#E2EAF2]">
                <p className="font-bold text-[#172B4D] text-sm">{selectedMember.full_name}</p>
                <p className="text-[#64748B]">Member ID: {selectedMember.id} • {selectedMember.department}</p>
                <p className="text-[#64748B] mt-1">
                  Entered at: <span className="font-semibold text-[#172B4D]">{formatTimeIST(selectedMember.last_entry_time)}</span> ({formatDurationElapsed(selectedMember.last_entry_time)} ago)
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">
                  Reason for Manual Exit <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g. Member forgot to scan finger upon leaving; verified by coordinator."
                  className="w-full p-2.5 rounded-xl border border-[#E2EAF2] focus:outline-none focus:border-[#1677C8] text-xs text-[#172B4D]"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  This action will close the member's active session and be recorded in the system audit log.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setExitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExit || !manualReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition disabled:opacity-50"
                >
                  {submittingExit ? 'Recording...' : 'Confirm Manual Exit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
