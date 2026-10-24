'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Fingerprint,
  Wifi,
  Trash2,
  Edit3,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Terminal,
  Cpu,
  Shield,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateIST } from '@/lib/utils/timezone';

export default function AdminPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Network & Hardware Sync Info
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [esp32Device, setEsp32Device] = useState<any>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  // Modals
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formDept, setFormDept] = useState('ECE');
  const [formYear, setFormYear] = useState('Year 3');
  const [formCategory, setFormCategory] = useState('Student Member');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formNotes, setFormNotes] = useState('');
  const [formSlot, setFormSlot] = useState<number>(1);
  const [formFingerPos, setFormFingerPos] = useState('RIGHT_INDEX');

  // Fetch all members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/members?limit=100');
      const data = await res.json();
      if (data.success) {
        setMembers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Network & Hardware IP Info
  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch('/api/network-info');
      const data = await res.json();
      if (data.success) {
        setNetworkInfo(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch ESP32 Device Status
  const fetchDeviceStatus = async () => {
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success && data.devices) {
        const foundEsp = data.devices.find((d: any) => d.id === 'dev-rlr-esp32-01');
        setEsp32Device(foundEsp || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchNetworkInfo();
    fetchDeviceStatus();

    // Poll device status every 15 seconds
    const interval = setInterval(() => {
      fetchDeviceStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute Next Available Fingerprint Slot
  const getNextFreeSlot = (currentMembers: any[]): number => {
    const usedSlots = new Set<number>();
    currentMembers.forEach((m) => {
      if (m.fingerprint_slot) {
        usedSlots.add(Number(m.fingerprint_slot));
      }
    });

    for (let i = 1; i <= 1000; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return 1;
  };

  // Open Modal to Add Student
  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormName('');
    setFormRoll('');
    setFormDept('ECE');
    setFormYear('Year 3');
    setFormCategory('Student Member');
    setFormPhone('');
    setFormEmail('');
    setFormStatus('ACTIVE');
    setFormNotes('');
    setFormSlot(getNextFreeSlot(members));
    setFormFingerPos('RIGHT_INDEX');
    setErrorMsg(null);
    setStudentModalOpen(true);
  };

  // Open Modal to Edit Student
  const handleOpenEditModal = (member: any) => {
    setEditingMember(member);
    setFormName(member.full_name || '');
    setFormRoll(member.roll_number || '');
    setFormDept(member.department || 'ECE');
    setFormYear(member.academic_year || 'Year 3');
    setFormCategory(member.category || 'Student Member');
    setFormPhone(member.phone || '');
    setFormEmail(member.email || '');
    setFormStatus(member.status || 'ACTIVE');
    setFormNotes(member.notes || '');
    setFormSlot(member.fingerprint_slot || getNextFreeSlot(members));
    setFormFingerPos(member.finger_position || 'RIGHT_INDEX');
    setErrorMsg(null);
    setStudentModalOpen(true);
  };

  // Save Student (Create or Edit)
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Student full name is required.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const payload = {
        full_name: formName.trim(),
        roll_number: formRoll.trim() || null,
        department: formDept,
        academic_year: formYear,
        category: formCategory,
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        status: formStatus,
        notes: formNotes.trim() || null,
        fingerprint_slot: Number(formSlot),
        finger_position: formFingerPos,
      };

      let res;
      if (editingMember) {
        res = await fetch(`/api/members/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (!res.ok || !result.success) {
        setErrorMsg(result.error || 'Failed to save student record.');
        return;
      }

      setStudentModalOpen(false);
      showToast(
        editingMember
          ? `Updated student details for ${formName}`
          : `Student ${formName} registered and assigned to Slot #${formSlot}!`
      );
      fetchMembers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (member: any) => {
    if (!confirm(`Are you sure you want to permanently delete student "${member.full_name}" (${member.id})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/members/${member.id}?hard=true`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Student ${member.full_name} deleted.`);
        fetchMembers();
      } else {
        alert(data.error || 'Could not delete student.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Clear All Mock Data
  const handleClearMockData = async () => {
    try {
      setClearing(true);
      const res = await fetch('/api/admin/clean-slate', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setClearModalOpen(false);
        showToast('All mock data cleared! Database is clean and ready for real students.');
        fetchMembers();
      } else {
        alert(data.error || 'Failed to clear mock data.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const copyToClipboard = (text: string, type: 'snippet' | 'ip') => {
    navigator.clipboard.writeText(text);
    if (type === 'snippet') {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } else {
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
      m.id?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !deptFilter || m.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <AppShell pageTitle="Student Biometric & Hardware Administration">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#073B8C] text-white px-5 py-3 rounded-2xl shadow-elevated flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-[#FFD21C]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. Header Hero with Action Buttons */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2EAF2] shadow-subtle mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#073B8C] flex items-center justify-center font-bold">
                <Shield className="w-5 h-5 text-[#1677C8]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#172B4D]">Student & Biometric Administration Console</h2>
                <p className="text-xs text-[#64748B]">
                  Register new laboratory students, assign optical fingerprint sensor memory slots, and manage hardware sync.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#FFD21C]" />
              <span>Register New Student</span>
            </button>

            <button
              onClick={() => setClearModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Mock Data</span>
            </button>

            <button
              onClick={fetchMembers}
              className="p-2.5 rounded-xl border border-[#E2EAF2] hover:bg-slate-50 text-[#64748B] transition"
              title="Refresh student list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Same-Wi-Fi Connection & ESP32 Hardware Status Hub */}
      <div className="bg-gradient-to-r from-slate-900 to-[#073B8C] text-white rounded-2xl p-6 shadow-elevated mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#00A9E8]/20 text-[#00A9E8] border border-[#00A9E8]/40">
                <Wifi className="w-3 h-3" />
                SAME WI-FI HARDWARE BRIDGE
              </span>
              {esp32Device?.status === 'ONLINE' ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  ESP32 HARDWARE CONNECTED
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  WAITING FOR ESP32 TO CONNECT
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              Connect ESP32 & Laptop to Same Wi-Fi Network
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your laptop is running on IP <strong className="text-[#FFD21C] font-mono">{networkInfo?.primaryIp || '10.206.84.110'}</strong> on port <strong className="text-[#FFD21C] font-mono">{networkInfo?.port || '3001'}</strong>.
              Connect your ESP32 to the same Wi-Fi router or Mobile Hotspot (<span className="text-[#00A9E8] font-semibold">Redmi 13 5G</span>) to send optical fingerprint scans directly into the lab database.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 w-full lg:w-auto min-w-[320px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700 mb-2.5 text-xs">
              <span className="text-slate-400 font-medium">Laptop Wi-Fi IP Address</span>
              <button
                onClick={() => copyToClipboard(networkInfo?.primaryIp || '10.206.84.110', 'ip')}
                className="flex items-center gap-1 text-[#00A9E8] hover:text-white transition font-mono text-[11px]"
              >
                {copiedIp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedIp ? 'Copied IP!' : 'Copy IP'}</span>
              </button>
            </div>
            <div className="font-mono text-sm font-bold text-[#FFD21C] mb-3">
              {networkInfo?.primaryIp || '10.206.84.110'}:{networkInfo?.port || '3001'}
            </div>

            <button
              onClick={() => copyToClipboard(networkInfo?.configSnippet || '', 'snippet')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/40 text-xs font-semibold text-white transition"
            >
              {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5 text-[#00A9E8]" />}
              <span>{copiedSnippet ? 'Copied config.h Snippet!' : 'Copy ESP32 config.h Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2EAF2] shadow-subtle mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, roll no, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none focus:border-[#1677C8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] text-[#172B4D] focus:outline-none"
          >
            <option value="">All Departments</option>
            <option value="ECE">ECE</option>
            <option value="CSE">CSE</option>
            <option value="Mechanical">Mechanical</option>
            <option value="EEE">EEE</option>
            <option value="Civil">Civil</option>
            <option value="Chemical">Chemical</option>
            <option value="MME">MME</option>
          </select>

          <span className="text-xs text-[#64748B] font-medium px-2">
            Showing {filteredMembers.length} {filteredMembers.length === 1 ? 'student' : 'students'}
          </span>
        </div>
      </div>

      {/* 4. Student Directory & Fingerprint Matrix Table */}
      <div className="bg-white rounded-2xl border border-[#E2EAF2] shadow-subtle overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1677C8]" />
            <span>Loading enrolled student records...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <EmptyState
              icon={UserCheck}
              title="No Students Registered Yet"
              description="The database is clean! Click 'Register New Student' above to add your first laboratory student and assign their optical fingerprint slot."
              actionLabel="Register First Student"
              onAction={handleOpenAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#172B4D]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2EAF2] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student Name & Roll No</th>
                  <th className="py-3.5 px-4">Member ID</th>
                  <th className="py-3.5 px-4">Department & Year</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Sensor Memory Slot</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EAF2]">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                          {m.full_name
                            ?.split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-[#172B4D]">{m.full_name}</div>
                          <div className="text-[11px] text-[#64748B] font-mono">
                            {m.roll_number || 'No Roll No'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B]">
                      {m.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#172B4D]">{m.department}</div>
                      <div className="text-[11px] text-[#64748B]">{m.academic_year}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {m.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {m.fingerprint_slot ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Slot #{m.fingerprint_slot}</span>
                          <span className="text-[10px] text-emerald-600 font-normal">
                            ({m.finger_position ? m.finger_position.replace('_', ' ') : 'Finger'})
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Unassigned</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge
                        type="status"
                        value={m.status || 'ACTIVE'}
                      />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#073B8C] hover:bg-slate-100 transition"
                          title="Edit Student & Slot"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =======================================================================
          MODAL 1: REGISTER / EDIT STUDENT & FINGERPRINT
      ======================================================================== */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-elevated border border-[#E2EAF2]">
            <div className="p-6 border-b border-[#E2EAF2] flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#073B8C] flex items-center justify-center font-bold">
                  <Fingerprint className="w-5 h-5 text-[#1677C8]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#172B4D]">
                    {editingMember ? 'Edit Student & Fingerprint Slot' : 'Register New Student & Fingerprint'}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Enter student academic profile and assign optical sensor memory slot.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStudentModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Section 1: Academic & Personal Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#073B8C] pb-1 border-b border-[#E2EAF2]">
                  1. Student Identity & Department
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none focus:border-[#1677C8]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Roll Number / Student ID *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. R200101"
                      value={formRoll}
                      onChange={(e) => setFormRoll(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none focus:border-[#1677C8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Department *
                    </label>
                    <select
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none"
                    >
                      <option value="ECE">ECE</option>
                      <option value="CSE">CSE</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="EEE">EEE</option>
                      <option value="Civil">Civil</option>
                      <option value="Chemical">Chemical</option>
                      <option value="MME">MME</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Academic Year *
                    </label>
                    <select
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none"
                    >
                      <option value="Year 1">Year 1</option>
                      <option value="Year 2">Year 2</option>
                      <option value="Year 3">Year 3</option>
                      <option value="Year 4">Year 4</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Member Role *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none"
                    >
                      <option value="Student Member">Student Member</option>
                      <option value="Robotics Lab Coordinator">Lab Coordinator</option>
                      <option value="Club Core Team">Club Core Team</option>
                      <option value="Faculty Supervisor">Faculty Supervisor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="rahul.ece@rguktrkv.ac.in"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Biometric Fingerprint Assignment */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#073B8C] pb-1 border-b border-[#E2EAF2]">
                  2. Optical Fingerprint Sensor Slot (R307 / AS608)
                </h4>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/60 flex items-start gap-2.5">
                  <Fingerprint className="w-5 h-5 text-[#1677C8] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#172B4D]">
                    <span className="font-bold">Hardware Slot Mapping:</span> When this student scans their finger on the sensor, the DSP processor outputs this Slot ID.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Sensor Memory Slot (1 – 1000) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={1000}
                      value={formSlot}
                      onChange={(e) => setFormSlot(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold text-[#073B8C] bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none"
                    />
                    <span className="text-[10px] text-[#64748B] block mt-0.5">
                      Auto-generated credential: <code className="text-[#073B8C]">FP-RLR-2024-{String(formSlot).padStart(3, '0')}</code>
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                      Registered Finger Position
                    </label>
                    <select
                      value={formFingerPos}
                      onChange={(e) => setFormFingerPos(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#F4FBFF] border border-[#E2EAF2] focus:outline-none"
                    >
                      <option value="RIGHT_INDEX">Right Index Finger</option>
                      <option value="RIGHT_THUMB">Right Thumb</option>
                      <option value="RIGHT_MIDDLE">Right Middle Finger</option>
                      <option value="LEFT_INDEX">Left Index Finger</option>
                      <option value="LEFT_THUMB">Left Thumb</option>
                    </select>
                  </div>
                </div>

                {/* Physical Enrollment Instructions Box */}
                <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono space-y-1.5">
                  <div className="text-[#00A9E8] font-bold flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>How to Enroll Finger on Physical Sensor:</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    1. Open the Arduino Serial Monitor at <strong className="text-[#FFD21C]">115200 baud</strong>.
                  </p>
                  <p className="text-[11px] text-slate-300">
                    2. Type <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">enroll {formSlot}</code> and press Enter.
                  </p>
                  <p className="text-[11px] text-slate-300">
                    3. Ask student to place their {formFingerPos.replace('_', ' ').toLowerCase()} on the optical sensor twice.
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-[#E2EAF2] flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2EAF2] hover:bg-slate-50 text-xs font-medium text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#073B8C] hover:bg-[#062F70] text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingMember ? 'Update Student Record' : 'Register Student & Assign Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 2: CONFIRM CLEAR ALL MOCK DATA
      ======================================================================== */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-elevated border border-[#E2EAF2]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-[#172B4D] mb-1">
              Remove All Mock Students?
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed mb-4">
              This will permanently delete the 12 sample mock student profiles, dummy attendance events, and test sessions so you can begin fresh with real laboratory members.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#172B4D] space-y-1 mb-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin user accounts (<strong className="font-mono">admin / admin123</strong>) are kept</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ESP32 Hardware & Kiosk device configurations are kept</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                disabled={clearing}
                className="px-4 py-2 rounded-xl border border-[#E2EAF2] hover:bg-slate-50 text-xs font-medium text-[#64748B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearMockData}
                disabled={clearing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {clearing ? 'Clearing...' : 'Yes, Remove All Mock Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
