'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Clock,
  Layers,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTimeIST } from '@/lib/utils/timezone';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (actionFilter) params.append('action', actionFilter);
      if (targetTypeFilter) params.append('targetType', targetTypeFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setLogs(result.data);
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
    fetchAuditLogs();
  }, [pagination.page, actionFilter, targetTypeFilter]);

  return (
    <AppShell pageTitle="Administrative Audit Log & Traceability">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2EAF2] shadow-subtle mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#172B4D]">Immutable System Audit Trail</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              TAMPER EVIDENT
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Complete audit logging of all administrative attendance corrections, credential enrollments, member modifications, and security actions.
          </p>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by admin username, ID, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs focus:outline-none focus:border-[#1677C8]"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
          >
            <option value="">All Actions</option>
            <option value="ATTENDANCE_CORRECTED">Attendance Corrected</option>
            <option value="CREDENTIAL_ENROLLED">Credential Enrolled</option>
            <option value="CREDENTIAL_REVOKED">Credential Revoked</option>
            <option value="MEMBER_CREATED">Member Created</option>
            <option value="MEMBER_UPDATED">Member Updated</option>
            <option value="MEMBER_DEACTIVATED">Member Deactivated</option>
            <option value="SETTINGS_UPDATED">Settings Updated</option>
            <option value="DEVICE_MODE_SWITCHED">Device Mode Switched</option>
          </select>

          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
          >
            <option value="">All Target Types</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="MEMBER">Member</option>
            <option value="CREDENTIAL">Credential</option>
            <option value="SETTINGS">Settings</option>
            <option value="DEVICE">Device</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setActionFilter('');
              setTargetTypeFilter('');
              setPagination({ ...pagination, page: 1 });
            }}
            className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] hover:bg-slate-100 text-[#64748B] text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* 3. Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-[#E2EAF2] shadow-subtle overflow-hidden">
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4FBFF] border-b border-[#E2EAF2] text-[#64748B] uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">Audit ID</th>
                  <th className="py-3 px-4">Admin Username</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Details Summary</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EAF2]">
                {logs.map((log) => {
                  let parsedDetails: any = {};
                  try {
                    parsedDetails = JSON.parse(log.details);
                  } catch {}

                  return (
                    <tr key={log.id} className="hover:bg-[#F4FBFF]/70 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">{log.id}</td>
                      <td className="py-3 px-4 font-bold text-[#172B4D]">{log.username}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#073B8C]">{log.target_type}</td>
                      <td className="py-3 px-4 font-mono text-[#64748B]">{log.target_id || '—'}</td>
                      <td className="py-3 px-4 text-[#172B4D]">{formatDateTimeIST(log.timestamp)}</td>
                      <td className="py-3 px-4 text-[#64748B] truncate max-w-xs font-mono text-[11px]">
                        {log.details}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#073B8C] hover:bg-[#F4FBFF]"
                          title="View audit event payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ShieldAlert}
            title="No Audit Logs Found"
            description="Audit events are recorded whenever administrators make changes to members, settings, devices, or attendance sessions."
          />
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#E2EAF2] flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Showing Page <span className="font-bold text-[#172B4D]">{pagination.page}</span> of{' '}
            <span className="font-bold text-[#172B4D]">{pagination.totalPages || 1}</span> ({pagination.total} audit events)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              className="px-3 py-1.5 rounded-lg border border-[#E2EAF2] bg-white hover:bg-[#F4FBFF] disabled:opacity-40 text-[#172B4D] font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              className="px-3 py-1.5 rounded-lg border border-[#E2EAF2] bg-white hover:bg-[#F4FBFF] disabled:opacity-40 text-[#172B4D] font-medium flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-[#E2EAF2] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E2EAF2] bg-[#F4FBFF] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#172B4D]">Audit Record Details</h3>
                <p className="text-xs font-mono text-[#64748B]">{selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172B4D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Admin User</span>
                  <span className="font-bold text-[#172B4D]">{selectedLog.username}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Action</span>
                  <span className="font-bold text-purple-700">{selectedLog.action}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Target Type</span>
                  <span className="font-bold text-[#073B8C]">{selectedLog.target_type}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Timestamp</span>
                  <span className="font-semibold text-[#172B4D]">{formatDateTimeIST(selectedLog.timestamp)}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#94A3B8] block mb-1">
                  Full Event Details (JSON)
                </span>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-[#E2EAF2] bg-[#F4FBFF] flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
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
