'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Fingerprint,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateIST, formatTimeIST } from '@/lib/utils/timezone';

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  // Modals
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollingMember, setEnrollingMember] = useState<any>(null);
  const [enrollStep, setEnrollStep] = useState<number>(1);
  const [enrollQuality, setEnrollQuality] = useState(96);
  const [enrollFingerPos, setEnrollFingerPos] = useState('RIGHT_INDEX');
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importSummary, setImportSummary] = useState<any>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (search) params.append('search', search);
      if (department) params.append('department', department);
      if (academicYear) params.append('academicYear', academicYear);
      if (category) params.append('category', category);
      if (status) params.append('status', status);

      const res = await fetch(`/api/members?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setMembers(result.data);
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
    fetchMembers();
  }, [pagination.page, department, academicYear, category, status]);

  // Open Profile Drawer
  const handleViewProfile = async (member: any) => {
    setProfileMember(member);
    setProfileModalOpen(true);
    try {
      const res = await fetch(`/api/members/${member.id}`);
      const data = await res.json();
      if (data.success) {
        setProfileData(data);
      }
    } catch {}
  };

  // Open Enroll Fingerprint Modal
  const handleOpenEnroll = (member: any) => {
    setEnrollingMember(member);
    setEnrollStep(1);
    setEnrollFingerPos('RIGHT_INDEX');
    setEnrollMessage(null);
    setEnrollModalOpen(true);
  };

  // Execute Enrollment
  const handleProcessEnrollment = async () => {
    try {
      setEnrollStep(2); // Capturing
      // Simulate 3 touches
      await new Promise((r) => setTimeout(r, 600));
      setEnrollStep(3); // Analyzing minutiae
      await new Promise((r) => setTimeout(r, 500));

      const credToken = `FP-RLR-${enrollingMember.id}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const res = await fetch('/api/biometrics/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: enrollingMember.id,
          credentialReference: credToken,
          fingerPosition: enrollFingerPos,
          qualityScore: enrollQuality,
          replaceExisting: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEnrollStep(4); // Success
        setEnrollMessage(`Fingerprint enrolled successfully for ${enrollingMember.full_name}`);
        fetchMembers();
      } else {
        setEnrollMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setEnrollMessage(`Enrollment error: ${err.message}`);
    }
  };

  // Save Member (Add / Edit)
  const handleSaveMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload: any = {
      id: formData.get('id') as string,
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      department: formData.get('department') as string,
      academic_year: formData.get('academic_year') as string,
      roll_number: formData.get('roll_number') as string,
      category: formData.get('category') as string,
      status: formData.get('status') as string,
      notes: formData.get('notes') as string,
    };

    try {
      if (editingMember) {
        // Edit PUT
        await fetch(`/api/members/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Add POST
        await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setAddEditModalOpen(false);
      setEditingMember(null);
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Activation (Soft Deactivate)
  const handleToggleStatus = async (member: any) => {
    const nextStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await fetch(`/api/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  // Import CSV
  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    try {
      const res = await fetch('/api/members/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: csvText }),
      });
      const data = await res.json();
      if (data.success) {
        setImportSummary(data.summary);
        fetchMembers();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AppShell pageTitle="Robotics Lab Members Directory">
      {/* 1. Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-[#172B4D]">Registered Robotics Lab Members</h2>
          <p className="text-xs text-[#64748B]">Manage students, coordinators, faculty, and biometric credentials</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setCsvText('');
              setImportSummary(null);
              setImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E2EAF2] hover:bg-[#F4FBFF] text-[#172B4D] text-xs font-bold transition shadow-subtle"
          >
            <Upload className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Import CSV</span>
          </button>
          <a
            href="/api/members/export"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E2EAF2] hover:bg-[#F4FBFF] text-[#172B4D] text-xs font-bold transition shadow-subtle"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => {
              setEditingMember(null);
              setAddEditModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#FFD21C]" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by name, ID, roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMembers()}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs focus:outline-none focus:border-[#1677C8]"
            />
          </div>

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

          {/* Academic Year */}
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
          >
            <option value="">All Academic Years</option>
            <option value="Year 1">Year 1</option>
            <option value="Year 2">Year 2</option>
            <option value="Year 3">Year 3</option>
            <option value="Year 4">Year 4</option>
            <option value="Faculty">Faculty</option>
          </select>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
          >
            <option value="">All Categories</option>
            <option value="Student Member">Student Member</option>
            <option value="Robotics Lab Coordinator">Lab Coordinator</option>
            <option value="Club Core Team">Club Core Team</option>
            <option value="Faculty Supervisor">Faculty Supervisor</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs text-[#172B4D] focus:outline-none focus:border-[#1677C8]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      {/* 3. Members Table */}
      <div className="bg-white rounded-2xl border border-[#E2EAF2] shadow-subtle overflow-hidden">
        {members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4FBFF] border-b border-[#E2EAF2] text-[#64748B] uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Member ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Year / Roll</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Fingerprint</th>
                  <th className="py-3 px-4">Presence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EAF2]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F4FBFF]/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {m.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#172B4D]">{m.full_name}</p>
                          <p className="text-[11px] text-[#64748B]">{m.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#073B8C]">{m.id}</td>
                    <td className="py-3 px-4 text-[#172B4D] font-medium">{m.department}</td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {m.academic_year} {m.roll_number ? `(${m.roll_number})` : ''}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type="category" value={m.category} />
                    </td>
                    <td className="py-3 px-4">
                      {m.credential_reference ? (
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-mono text-[11px] font-bold">
                            {m.fingerprint_slot ? `Slot #${m.fingerprint_slot}` : m.credential_reference}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenEnroll(m)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        >
                          <Fingerprint className="w-3 h-3" /> Enroll Now
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.is_inside === 1
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {m.is_inside === 1 ? '● Inside' : '○ Outside'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type="status" value={m.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewProfile(m)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#073B8C] hover:bg-[#F4FBFF]"
                          title="View Attendance History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEnroll(m)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#00A9E8] hover:bg-[#F4FBFF]"
                          title="Enroll/Re-enroll Fingerprint"
                        >
                          <Fingerprint className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingMember(m);
                            setAddEditModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1677C8] hover:bg-[#F4FBFF]"
                          title="Edit Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className={`p-1.5 rounded-lg transition ${
                            m.status === 'ACTIVE'
                              ? 'text-rose-500 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={m.status === 'ACTIVE' ? 'Deactivate Member' : 'Activate Member'}
                        >
                          {m.status === 'ACTIVE' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={UserCheck}
            title="No Members Registered"
            description="Add members to enable fingerprint enrollment and laboratory attendance tracking."
            actionLabel="Add First Member"
            onAction={() => {
              setEditingMember(null);
              setAddEditModalOpen(true);
            }}
          />
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#E2EAF2] flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Showing Page <span className="font-bold text-[#172B4D]">{pagination.page}</span> of{' '}
            <span className="font-bold text-[#172B4D]">{pagination.totalPages || 1}</span> ({pagination.total} members)
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

      {/* MODAL 1: ADD / EDIT MEMBER */}
      {addEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-[#E2EAF2] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2EAF2] flex items-center justify-between bg-[#F4FBFF]">
              <h3 className="text-base font-bold text-[#172B4D]">
                {editingMember ? 'Edit Member Profile' : 'Register New Member'}
              </h3>
              <button
                onClick={() => setAddEditModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172B4D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">
                    Member ID <span className="text-[#94A3B8]">(Auto if blank)</span>
                  </label>
                  <input
                    type="text"
                    name="id"
                    defaultValue={editingMember?.id || ''}
                    placeholder="e.g. RLR-2024-015"
                    disabled={!!editingMember}
                    className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] disabled:opacity-60 focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    defaultValue={editingMember?.full_name || ''}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-white focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="department"
                    required
                    defaultValue={editingMember?.department || 'ECE'}
                    className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-white focus:outline-none focus:border-[#1677C8]"
                  >
                    <option value="ECE">ECE</option>
                    <option value="CSE">CSE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="EEE">EEE</option>
                    <option value="Robotics Club">Robotics Club</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">
                    Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="academic_year"
                    required
                    defaultValue={editingMember?.academic_year || 'Year 1'}
                    className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-white focus:outline-none focus:border-[#1677C8]"
                  >
                    <option value="Year 1">Year 1</option>
                    <option value="Year 2">Year 2</option>
                    <option value="Year 3">Year 3</option>
                    <option value="Year 4">Year 4</option>
                    <option value="Faculty">Faculty</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">Roll Number</label>
                  <input
                    type="text"
                    name="roll_number"
                    defaultValue={editingMember?.roll_number || ''}
                    placeholder="e.g. R200101"
                    className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-white focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editingMember?.category || 'Student Member'}
                    className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-white focus:outline-none focus:border-[#1677C8]"
                  >
                    <option value="Student Member">Student Member</option>
                    <option value="Robotics Lab Coordinator">Robotics Lab Coordinator</option>
                    <option value="Club Core Team">Club Core Team</option>
                    <option value="Faculty Supervisor">Faculty Supervisor</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingMember?.email || ''}
                    placeholder="student@rguktrkv.ac.in"
                    className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-white focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingMember?.phone || ''}
                    placeholder="+91 98765 43210"
                    className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-white focus:outline-none focus:border-[#1677C8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={editingMember?.status || 'ACTIVE'}
                  className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-white focus:outline-none focus:border-[#1677C8]"
                >
                  <option value="ACTIVE">ACTIVE (Authorized to enter)</option>
                  <option value="INACTIVE">INACTIVE (Entry denied)</option>
                  <option value="SUSPENDED">SUSPENDED (Access blocked)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Notes / Projects</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingMember?.notes || ''}
                  placeholder="e.g. Quadcopter PID Tuning; Autonomous Mobile Robot team"
                  className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-white focus:outline-none focus:border-[#1677C8]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2EAF2] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white font-bold"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GUIDED FINGERPRINT ENROLLMENT */}
      {enrollModalOpen && enrollingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-[#E2EAF2] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E2EAF2] bg-[#F4FBFF] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#172B4D]">Biometric Fingerprint Enrollment</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Link biometric credential to member</p>
              </div>
              <button
                onClick={() => setEnrollModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172B4D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-[#E2EAF2] text-left mb-5">
                <p className="font-bold text-sm text-[#172B4D]">{enrollingMember.full_name}</p>
                <p className="text-[#64748B]">Member ID: {enrollingMember.id} • {enrollingMember.department}</p>
              </div>

              {enrollStep === 1 && (
                <div className="space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-2xl bg-blue-50 border border-blue-200 text-[#073B8C] flex items-center justify-center">
                    <Fingerprint className="w-14 h-14 text-[#00A9E8]" />
                  </div>
                  <div>
                    <label className="block font-bold text-[#172B4D] mb-1">Select Finger to Enroll</label>
                    <select
                      value={enrollFingerPos}
                      onChange={(e) => setEnrollFingerPos(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[#E2EAF2] bg-[#F4FBFF] text-xs font-medium"
                    >
                      <option value="RIGHT_INDEX">Right Index Finger (Recommended)</option>
                      <option value="RIGHT_THUMB">Right Thumb</option>
                      <option value="LEFT_INDEX">Left Index Finger</option>
                      <option value="LEFT_THUMB">Left Thumb</option>
                    </select>
                  </div>
                  <p className="text-[#64748B]">
                    Ensure the scanner is clean. You will place the finger 3 times to register the minutiae template.
                  </p>
                  <button
                    onClick={handleProcessEnrollment}
                    className="w-full py-2.5 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white font-bold transition shadow-sm"
                  >
                    Start Capture on Scanner
                  </button>
                </div>
              )}

              {(enrollStep === 2 || enrollStep === 3) && (
                <div className="py-6 space-y-3">
                  <Fingerprint className="w-16 h-16 text-[#00A9E8] mx-auto animate-pulse" />
                  <p className="font-bold text-[#172B4D]">
                    {enrollStep === 2 ? 'Capturing sample (Touch 1 of 3)...' : 'Extracting minutiae features...'}
                  </p>
                  <div className="w-48 bg-slate-100 h-2 rounded-full mx-auto overflow-hidden">
                    <div className="bg-[#00A9E8] h-full w-2/3 animate-pulse"></div>
                  </div>
                </div>
              )}

              {enrollStep === 4 && (
                <div className="py-4 space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
                  <div>
                    <h4 className="text-base font-bold text-[#172B4D]">Enrollment Successful!</h4>
                    <p className="text-emerald-700 font-semibold mt-1">Quality Score: {enrollQuality}% (Optimal)</p>
                    <p className="text-[#64748B] mt-1">
                      Opaque credential reference generated and associated with member record.
                    </p>
                  </div>
                  <button
                    onClick={() => setEnrollModalOpen(false)}
                    className="px-6 py-2 rounded-xl bg-[#073B8C] text-white font-bold"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MEMBER PROFILE & ATTENDANCE HISTORY */}
      {profileModalOpen && profileMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-[#E2EAF2] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2EAF2] bg-[#F4FBFF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {profileMember.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#172B4D]">{profileMember.full_name}</h3>
                  <p className="text-xs text-[#64748B]">
                    {profileMember.id} • {profileMember.department} ({profileMember.academic_year})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172B4D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#F4FBFF] border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Total Lab Visits</span>
                  <span className="text-lg font-bold text-[#073B8C] mt-1 block">
                    {profileData?.statistics?.totalVisits || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F4FBFF] border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Total Time Inside</span>
                  <span className="text-lg font-bold text-[#1677C8] mt-1 block">
                    {profileData?.statistics?.totalHours || 0} hrs
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F4FBFF] border border-[#E2EAF2]">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Current Presence</span>
                  <span className="text-sm font-bold text-emerald-600 mt-1.5 block">
                    {profileMember.is_inside === 1 ? 'Inside Lab' : 'Outside Lab'}
                  </span>
                </div>
              </div>

              {/* Attendance History */}
              <div>
                <h4 className="font-bold text-[#172B4D] mb-2 text-xs uppercase tracking-wider">
                  Recent Attendance Sessions
                </h4>
                {profileData?.recentSessions?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {profileData.recentSessions.map((sess: any) => (
                      <div
                        key={sess.id}
                        className="p-2.5 rounded-xl border border-[#E2EAF2] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#172B4D]">{sess.session_date}</span>
                          <span className="text-[#64748B] ml-2">
                            {formatTimeIST(sess.entry_time)} - {sess.exit_time ? formatTimeIST(sess.exit_time) : 'Still Inside'}
                          </span>
                        </div>
                        <span className="font-semibold text-[#073B8C]">
                          {sess.duration_minutes !== null ? `${sess.duration_minutes} mins` : 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#64748B] text-xs">No attendance sessions recorded yet.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#E2EAF2] bg-[#F4FBFF] flex justify-end">
              <button
                onClick={() => setProfileModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#073B8C] text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CSV IMPORT */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-[#E2EAF2] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E2EAF2] bg-[#F4FBFF] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#172B4D]">Bulk Import Members from CSV</h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172B4D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#64748B]">
                Paste CSV data below. Header columns must include: <code>Name, Department, Year, Roll, Email, Category</code>
              </p>

              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Name, Department, Academic Year, Roll Number, Category&#10;Kavya Rao, ECE, Year 2, R210999, Student Member&#10;Siddharth Sen, CSE, Year 3, R200888, Club Core Team"
                className="w-full p-2.5 rounded-xl border border-[#E2EAF2] font-mono text-[11px] focus:outline-none focus:border-[#1677C8]"
              />

              {importSummary && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <p className="font-bold">Import Complete!</p>
                  <p>
                    Imported: {importSummary.imported} | Skipped: {importSummary.skipped} | Processed: {importSummary.totalProcessed}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportCsv}
                  className="px-5 py-2 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white font-bold"
                >
                  Start Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
