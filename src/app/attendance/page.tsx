'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  Download,
  Printer,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Layers,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatTimeIST, formatDateIST, formatDateTimeIST } from '@/lib/utils/timezone';

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'events' | 'sessions'>('events');
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [verificationSource, setVerificationSource] = useState('');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('view', activeTab);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      if (search) params.append('search', search);
      if (eventType) params.append('eventType', eventType);
      if (department) params.append('department', department);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (verificationSource) params.append('verificationSource', verificationSource);
      if (exceptionsOnly) params.append('exceptionsOnly', 'true');

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [activeTab, pagination.page, eventType, department, startDate, endDate, verificationSource, exceptionsOnly]);

  const handleResetFilters = () => {
    setSearch('');
    setEventType('');
    setDepartment('');
    setStartDate('');
    setEndDate('');
    setVerificationSource('');
    setExceptionsOnly(false);
    setPagination({ ...pagination, page: 1 });
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    params.append('view', activeTab);
    params.append('format', 'csv');
    if (search) params.append('search', search);
    if (eventType) params.append('eventType', eventType);
    if (department) params.append('department', department);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (verificationSource) params.append('verificationSource', verificationSource);
    if (exceptionsOnly) params.append('exceptionsOnly', 'true');

    window.location.href = `/api/attendance?${params.toString()}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell pageTitle="Robotics Lab Attendance Records">
      {/* 1. Top Controls Bar: Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#E2EAF2] shadow-subtle">
          <button
            onClick={() => {
              setActiveTab('events');
              setPagination({ ...pagination, page: 1 });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'events'
                ? 'bg-[#073B8C] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#073B8C] hover:bg-[#F4FBFF]'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance Events Log</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('sessions');
              setPagination({ ...pagination, page: 1 });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'sessions'
                ? 'bg-[#073B8C] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#073B8C] hover:bg-[#F4FBFF]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Paired Sessions Report</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2EAF2] hover:bg-[#F4FBFF] text-[#172B4D] text-xs font-bold shadow-subtle transition"
          >
            <Printer className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white text-xs font-bold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5 text-[#FFD21C]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle mb-6 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAttendance()}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs focus:outline-none focus:border-[#1677C8]"
            />
          </div>

          {/* Event Type (Only on Events view) */}
          {activeTab === 'events' ? (
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
            >
              <option value="">All Actions (Entry/Exit)</option>
              <option value="ENTRY">Entries Only</option>
              <option value="EXIT">Exits Only</option>
            </select>
          ) : (
            <div className="text-xs text-[#64748B] flex items-center px-3 py-1.5 bg-[#F4FBFF] rounded-xl border border-[#E2EAF2]">
              Paired Visits View
            </div>
          )}

          {/* Department */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
          >
            <option value="">All Departments</option>
            <option value="ECE">ECE</option>
            <option value="CSE">CSE</option>
            <option value="Mechanical">Mechanical</option>
            <option value="EEE">EEE</option>
            <option value="Robotics Club">Robotics Club</option>
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
            title="Filter from date"
          />

          {/* End Date */}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
            title="Filter to date"
          />

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] hover:bg-slate-100 text-[#64748B] text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Exceptions Filter Toggle */}
        <div className="mt-3 pt-3 border-t border-[#E2EAF2] flex items-center justify-between text-xs text-[#64748B]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exceptionsOnly}
              onChange={(e) => setExceptionsOnly(e.target.checked)}
              className="rounded text-[#073B8C] focus:ring-0"
            />
            <span className="font-semibold text-[#172B4D]">
              Show attendance exceptions only (e.g. manual corrections, open overnight sessions)
            </span>
          </label>
          <span>Total records: {pagination.total}</span>
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-2xl border border-[#E2EAF2] shadow-subtle overflow-hidden">
        {data.length > 0 ? (
          activeTab === 'events' ? (
            /* EVENTS TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F4FBFF] border-b border-[#E2EAF2] text-[#64748B] uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Member ID</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Time (IST)</th>
                    <th className="py-3 px-4">Verification Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2EAF2]">
                  {data.map((evt) => (
                    <tr key={evt.id} className="hover:bg-[#F4FBFF]/70 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">{evt.id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white flex items-center justify-center font-bold text-xs">
                            {evt.member_name?.charAt(0) || 'M'}
                          </div>
                          <span className="font-bold text-[#172B4D]">{evt.member_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[#073B8C]">{evt.member_id}</td>
                      <td className="py-3 px-4 text-[#64748B]">{evt.department}</td>
                      <td className="py-3 px-4">
                        <StatusBadge type="action" value={evt.event_type} />
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">{evt.event_date}</td>
                      <td className="py-3 px-4 font-bold text-[#172B4D]">{formatTimeIST(evt.timestamp)}</td>
                      <td className="py-3 px-4">
                        <StatusBadge type="source" value={evt.verification_source} />
                      </td>
                      <td className="py-3 px-4">
                        {evt.is_corrected ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Admin Corrected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedRecord(evt);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#073B8C] hover:bg-[#F4FBFF] transition"
                          title="View complete record details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* SESSIONS TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F4FBFF] border-b border-[#E2EAF2] text-[#64748B] uppercase font-semibold text-[11px]">
                    <th className="py-3 px-4">Session ID</th>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">First Entry (IST)</th>
                    <th className="py-3 px-4">Last Exit (IST)</th>
                    <th className="py-3 px-4">Total Time Inside</th>
                    <th className="py-3 px-4">Session Status</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2EAF2]">
                  {data.map((sess) => (
                    <tr key={sess.id} className="hover:bg-[#F4FBFF]/70 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">{sess.id}</td>
                      <td className="py-3 px-4 font-bold text-[#172B4D]">{sess.member_name}</td>
                      <td className="py-3 px-4 text-[#64748B]">{sess.department}</td>
                      <td className="py-3 px-4 text-[#64748B]">{sess.session_date}</td>
                      <td className="py-3 px-4 font-medium text-[#172B4D]">{formatTimeIST(sess.entry_time)}</td>
                      <td className="py-3 px-4 font-medium text-[#172B4D]">
                        {sess.exit_time ? formatTimeIST(sess.exit_time) : '— (Still Inside)'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#073B8C]">
                          {sess.duration_minutes !== null ? `${sess.duration_minutes} mins` : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge type="status" value={sess.status} />
                      </td>
                      <td className="py-3 px-4 text-[#64748B] truncate max-w-xs">{sess.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <EmptyState
            icon={CalendarCheck}
            title="No Attendance Records Found"
            description="No records matched the selected filters. Try broadening your date range or clearing the search terms."
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
          />
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#E2EAF2] flex items-center justify-between text-xs text-[#64748B] no-print">
          <div>
            Showing Page <span className="font-bold text-[#172B4D]">{pagination.page}</span> of{' '}
            <span className="font-bold text-[#172B4D]">{pagination.totalPages || 1}</span> ({pagination.total} records)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              className="px-3 py-1.5 rounded-lg border border-[#E2EAF2] bg-white hover:bg-[#F4FBFF] disabled:opacity-40 disabled:hover:bg-white text-[#172B4D] font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              className="px-3 py-1.5 rounded-lg border border-[#E2EAF2] bg-white hover:bg-[#F4FBFF] disabled:opacity-40 disabled:hover:bg-white text-[#172B4D] font-medium flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Event Detail Modal */}
      {detailModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-[#E2EAF2] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2EAF2] flex items-center justify-between bg-[#F4FBFF]">
              <div>
                <h3 className="text-base font-bold text-[#172B4D]">Attendance Event Detail</h3>
                <p className="text-xs font-mono text-[#64748B]">{selectedRecord.id}</p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172B4D] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2EAF2]">
                <p className="font-bold text-sm text-[#172B4D]">{selectedRecord.member_name}</p>
                <p className="text-[#64748B]">Member ID: {selectedRecord.member_id} • {selectedRecord.department}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Event Type</span>
                  <div className="mt-1">
                    <StatusBadge type="action" value={selectedRecord.event_type} />
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Verification Source</span>
                  <div className="mt-1">
                    <StatusBadge type="source" value={selectedRecord.verification_source} />
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Recorded Timestamp</span>
                  <span className="font-semibold text-[#172B4D] mt-1 block">
                    {formatDateTimeIST(selectedRecord.timestamp)}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Device</span>
                  <span className="font-semibold text-[#172B4D] mt-1 block">
                    {selectedRecord.device_name || 'Entrance Scanner'}
                  </span>
                </div>
              </div>

              {selectedRecord.is_corrected ? (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
                  <p className="font-bold">Administrative Correction Trail</p>
                  <p className="mt-0.5">Reason: {selectedRecord.correction_reason || 'Manual override by coordinator'}</p>
                </div>
              ) : null}

              {selectedRecord.notes && (
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Notes</span>
                  <p className="mt-0.5 text-[#172B4D]">{selectedRecord.notes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-[#E2EAF2] bg-[#F4FBFF] flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#073B8C] text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
