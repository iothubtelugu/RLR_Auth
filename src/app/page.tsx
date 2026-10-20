'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  LogIn,
  LogOut,
  UserCheck,
  Fingerprint,
  Activity,
  ArrowRight,
  Clock,
  Sparkles,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTimeIST, formatDateIST, formatDurationElapsed } from '@/lib/utils/timezone';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<'today' | '7d'>('today');
  const [searchFilter, setSearchFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (e) {
      console.error('Error fetching dashboard stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const summary = stats?.summary || {
    totalMembers: 0,
    activeMembers: 0,
    currentlyInside: 0,
    totalEntriesToday: 0,
    totalExitsToday: 0,
    uniqueMembersToday: 0,
    labCapacity: 40,
    occupancyPercentage: 0,
  };

  const device = stats?.deviceStatus || {
    name: 'Biometric Scanner',
    status: 'DEMO',
    isDemo: true,
  };

  // Filter recent activity
  const filteredActivity = (stats?.recentActivity || []).filter((item: any) => {
    const matchesSearch =
      searchFilter === '' ||
      item.member_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.member_id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.department?.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || item.event_type === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <AppShell pageTitle="Robotics Lab Operational Dashboard">
      {/* 1. Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {/* Card 1: Total Registered Members */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle hover:shadow-card transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Members</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#073B8C] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#172B4D] tracking-tight">{summary.totalMembers}</div>
            <div className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{summary.activeMembers} Active</span>
              <span>•</span>
              <span>{summary.totalMembers - summary.activeMembers} Inactive</span>
            </div>
          </div>
        </div>

        {/* Card 2: Currently Inside (Hero Card) */}
        <div className="bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white rounded-2xl p-4 shadow-card hover:shadow-elevated transition flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
            <Users className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Currently Inside</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD21C] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFD21C]"></span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
              {summary.currentlyInside}
              <span className="text-xs font-normal text-white/70">/ {summary.labCapacity} capacity</span>
            </div>
            {/* Occupancy progress bar */}
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-[#FFD21C] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (summary.currentlyInside / summary.labCapacity) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Entries Today */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle hover:shadow-card transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Entries Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#172B4D] tracking-tight">{summary.totalEntriesToday}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Check-in events recorded</div>
          </div>
        </div>

        {/* Card 4: Total Exits Today */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle hover:shadow-card transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Exits Today</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677C8] flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#172B4D] tracking-tight">{summary.totalExitsToday}</div>
            <div className="text-[11px] text-[#1677C8] font-medium mt-1">Check-out events recorded</div>
          </div>
        </div>

        {/* Card 5: Unique Members Today */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle hover:shadow-card transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Visitors</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#172B4D] tracking-tight">{summary.uniqueMembersToday}</div>
            <div className="text-[11px] text-[#64748B] mt-1">Distinct lab attendees today</div>
          </div>
        </div>

        {/* Card 6: Fingerprint Reader Status */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle hover:shadow-card transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reader Hardware</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-[#00A9E8] flex items-center justify-center">
              <Fingerprint className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${device.isDemo ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></span>
              <span className="text-sm font-bold text-[#172B4D] truncate">
                {device.isDemo ? 'DEMO ADAPTER' : device.status}
              </span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-1 truncate">
              {device.lastSuccessfulScan ? `Last: ${formatTimeIST(device.lastSuccessfulScan)}` : 'Ready for scan'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Analytics & Occupancy Quick Glance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left 2 Cols: Attendance Charts */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E2EAF2] shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#E2EAF2]">
            <div>
              <h2 className="text-sm font-bold text-[#172B4D] tracking-tight">Attendance Activity Analytics</h2>
              <p className="text-xs text-[#64748B]">Real-time laboratory entry and exit patterns</p>
            </div>
            <div className="flex items-center gap-1 bg-[#F4FBFF] p-1 rounded-xl border border-[#E2EAF2]">
              <button
                onClick={() => setChartRange('today')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  chartRange === 'today' ? 'bg-[#073B8C] text-white shadow-sm' : 'text-[#64748B] hover:text-[#073B8C]'
                }`}
              >
                Today (Hourly)
              </button>
              <button
                onClick={() => setChartRange('7d')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  chartRange === '7d' ? 'bg-[#073B8C] text-white shadow-sm' : 'text-[#64748B] hover:text-[#073B8C]'
                }`}
              >
                Last 7 Days
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartRange === 'today' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.hourlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2EAF2" />
                  <XAxis dataKey="hour" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2EAF2',
                      boxShadow: '0 4px 6px -1px rgba(7, 59, 140, 0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="entries" name="Entries" fill="#1677C8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.weeklyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2EAF2" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2EAF2',
                      boxShadow: '0 4px 6px -1px rgba(7, 59, 140, 0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="entries" name="Entries" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="exits" name="Exits" stroke="#1677C8" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Col: Currently Inside Quick Panel */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2EAF2] shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2EAF2] mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#172B4D]">Live Occupancy ({summary.currentlyInside})</h2>
                <p className="text-xs text-[#64748B]">Members present in the lab right now</p>
              </div>
              <Link
                href="/currently-inside"
                className="text-xs font-bold text-[#1677C8] hover:text-[#073B8C] flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {stats?.currentlyInsideMembers?.length > 0 ? (
                stats.currentlyInsideMembers.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF]/50 hover:bg-[#F4FBFF] transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {m.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#172B4D] truncate">{m.full_name}</p>
                        <p className="text-[11px] text-[#64748B] truncate">
                          {m.department} • In: {formatTimeIST(m.last_entry_time)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      {formatDurationElapsed(m.last_entry_time)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-[#64748B]">No members currently inside</div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2EAF2] mt-4 flex items-center justify-between text-xs text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live presence tracking active
            </span>
            <Link
              href="/kiosk"
              target="_blank"
              className="text-xs font-bold text-[#073B8C] hover:underline"
            >
              Open Kiosk
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Live Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-[#E2EAF2] shadow-subtle p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2EAF2]">
          <div>
            <h2 className="text-sm font-bold text-[#172B4D]">Recent Biometric Attendance Activity</h2>
            <p className="text-xs text-[#64748B]">Live stream of verified entries and exits</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search member or ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs focus:outline-none focus:border-[#1677C8] w-48 sm:w-56"
              />
            </div>
            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
            >
              <option value="ALL">All Actions</option>
              <option value="ENTRY">Entries Only</option>
              <option value="EXIT">Exits Only</option>
            </select>
          </div>
        </div>

        {/* Activity Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2EAF2] text-[#64748B] uppercase font-semibold text-[11px]">
                <th className="py-2.5 px-3">Member</th>
                <th className="py-2.5 px-3">Member ID</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Time (IST)</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Verification Source</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAF2]">
              {filteredActivity.length > 0 ? (
                filteredActivity.map((evt: any) => (
                  <tr key={evt.id} className="hover:bg-[#F4FBFF]/80 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {evt.member_name?.charAt(0) || 'M'}
                        </div>
                        <span className="font-bold text-[#172B4D]">{evt.member_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#64748B]">{evt.member_id}</td>
                    <td className="py-3 px-3 text-[#64748B]">{evt.department}</td>
                    <td className="py-3 px-3">
                      <StatusBadge type="action" value={evt.event_type} />
                    </td>
                    <td className="py-3 px-3 font-medium text-[#172B4D]">{formatTimeIST(evt.timestamp)}</td>
                    <td className="py-3 px-3 text-[#64748B]">{formatDateIST(evt.timestamp)}</td>
                    <td className="py-3 px-3">
                      <StatusBadge type="source" value={evt.verification_source} />
                    </td>
                    <td className="py-3 px-3">
                      {evt.is_corrected ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Admin Corrected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-xs text-[#64748B]">
                    No recent attendance records matching filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-3 border-t border-[#E2EAF2] mt-3 flex items-center justify-between text-xs text-[#64748B]">
          <span>Showing {filteredActivity.length} recent activity events</span>
          <Link href="/attendance" className="text-xs font-bold text-[#073B8C] hover:underline flex items-center gap-1">
            Open Full Attendance Log <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4. Bottom Information Panels: Frequent Visitors & System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Frequent Visitors */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2EAF2] shadow-subtle">
          <h3 className="text-sm font-bold text-[#172B4D] mb-1">Most Active Robotics Lab Members</h3>
          <p className="text-xs text-[#64748B] mb-4">Ranked by total recorded visits</p>

          <div className="space-y-2.5">
            {stats?.frequentVisitors?.map((visitor: any, idx: number) => (
              <div
                key={visitor.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#E2EAF2] hover:bg-[#F4FBFF] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#EBF3FF] text-[#073B8C] text-xs font-bold flex items-center justify-center">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#172B4D]">{visitor.full_name}</p>
                    <p className="text-[11px] text-[#64748B]">{visitor.department} • {visitor.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#073B8C]">{visitor.visit_count} visits</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exceptions & Device Telemetry */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2EAF2] shadow-subtle flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#172B4D] mb-1">System & Exception Alerts</h3>
            <p className="text-xs text-[#64748B] mb-4">Attendance anomalies and biometric reader health</p>

            {stats?.exceptions?.length > 0 ? (
              <div className="space-y-2 mb-4">
                {stats.exceptions.map((ex: any) => (
                  <div
                    key={ex.session_id}
                    className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">{ex.full_name}</span> ({ex.department}) inside &gt; 10 hrs
                      </div>
                    </div>
                    <Link
                      href="/currently-inside"
                      className="px-2 py-1 rounded bg-white text-xs font-bold text-amber-800 border border-amber-300"
                    >
                      Resolve
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero attendance anomalies detected. System operating normally.</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#F4FBFF] border border-[#E2EAF2] text-xs text-[#64748B] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-[#00A9E8]" />
              <span>Biometric engine: {device.name}</span>
            </div>
            <Link href="/devices" className="text-xs font-bold text-[#073B8C] hover:underline">
              Manage Devices
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
