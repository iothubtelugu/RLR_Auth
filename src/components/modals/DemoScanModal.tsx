'use client';

import React, { useState, useEffect } from 'react';
import { X, Fingerprint, Sparkles, UserX, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

interface DemoScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: () => void;
}

export const DemoScanModal: React.FC<DemoScanModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      setScanResult(null);
      setScanFeedback(null);
    }
  }, [isOpen]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/members?limit=25');
      const data = await res.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = async (memberId: string, credentialRef?: string) => {
    try {
      setScanFeedback('Simulating biometric sensor capture...');
      setScanResult(null);

      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          credentialReference: credentialRef,
          verificationSource: 'FINGERPRINT_DEMO',
        }),
      });

      const data = await res.json();
      setScanResult(data);
      setScanFeedback(data.message || (data.success ? 'Scan verified' : 'Scan rejected'));

      if (data.success && onScanSuccess) {
        onScanSuccess();
        loadMembers(); // refresh presence
      }
    } catch (err: any) {
      setScanResult({ success: false, message: err.message || 'Scan simulation failed' });
    }
  };

  const handleTestUnregistered = async () => {
    try {
      setScanFeedback('Scanning unknown finger...');
      setScanResult(null);

      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialReference: 'FP-UNKNOWN-GUEST-999',
          verificationSource: 'FINGERPRINT_DEMO',
        }),
      });

      const data = await res.json();
      setScanResult(data);
      setScanFeedback(data.message || 'Fingerprint not recognized');
    } catch (err: any) {
      setScanResult({ success: false, message: err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-elevated border border-[#E2EAF2] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2EAF2] flex items-center justify-between bg-[#F4FBFF]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00A9E8]/10 text-[#00A9E8] flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-[#073B8C]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">Biometric Scan Simulator</h2>
              <p className="text-xs text-[#64748B]">
                Trigger hardware/demo scan events to test entry, exit, and duplicate rejection.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172B4D] hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Result Alert Banner */}
        {scanResult && (
          <div
            className={`px-6 py-3 border-b flex items-center gap-3 ${
              scanResult.success
                ? scanResult.action === 'ENTRY'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
                : scanResult.cooldownActive
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {scanResult.success ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : scanResult.cooldownActive ? (
              <Clock className="w-5 h-5 flex-shrink-0 text-amber-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            )}
            <div className="flex-1 text-xs">
              <span className="font-bold">
                {scanResult.success
                  ? `[${scanResult.action}] Success: `
                  : scanResult.cooldownActive
                  ? '[COOLDOWN]: '
                  : '[ACCESS REJECTED]: '}
              </span>
              <span>{scanResult.message}</span>
              {scanResult.member && (
                <span className="ml-2 font-semibold">
                  ({scanResult.member.fullName} is now{' '}
                  <span className="underline">{scanResult.member.isInside ? 'INSIDE' : 'OUTSIDE'}</span>)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quick Edge-Case Test Scenarios */}
        <div className="px-6 py-3 bg-slate-50 border-b border-[#E2EAF2] flex flex-wrap gap-2 text-xs">
          <span className="text-[#64748B] font-semibold flex items-center mr-1">Special Scenarios:</span>
          <button
            onClick={handleTestUnregistered}
            className="px-2.5 py-1 rounded-lg bg-white border border-[#E2EAF2] hover:bg-rose-50 hover:border-rose-300 text-rose-700 font-medium transition"
          >
            Test Unregistered Finger
          </button>
          <button
            onClick={() => handleSimulateScan('RLR-2024-010')}
            className="px-2.5 py-1 rounded-lg bg-white border border-[#E2EAF2] hover:bg-amber-50 hover:border-amber-300 text-amber-700 font-medium transition"
          >
            Test Inactive Member (Teja)
          </button>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
            Click any member to simulate a fingerprint scan:
          </p>

          {loading ? (
            <div className="text-center py-8 text-xs text-[#64748B]">Loading members list...</div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E2EAF2] hover:border-[#1677C8] hover:bg-[#F4FBFF] transition group bg-white shadow-subtle"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#073B8C] to-[#1677C8] text-white flex items-center justify-center font-bold text-xs">
                    {member.full_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#172B4D]">{member.full_name}</span>
                      <span className="text-[11px] font-mono text-[#64748B]">{member.id}</span>
                      {member.status !== 'ACTIVE' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                          {member.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
                      <span>{member.department}</span>
                      <span>•</span>
                      <span>{member.academic_year}</span>
                      <span>•</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {member.credential_reference || 'No Fingerprint'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      member.is_inside === 1
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {member.is_inside === 1 ? '● Currently Inside' : '○ Outside'}
                  </span>

                  <button
                    onClick={() => handleSimulateScan(member.id, member.credential_reference)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#073B8C] hover:bg-[#062F70] text-white text-xs font-semibold transition shadow-sm"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-[#FFD21C]" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E2EAF2] bg-[#F4FBFF] flex items-center justify-between text-xs text-[#64748B]">
          <span>Tip: Scanning an outside member records ENTRY; scanning an inside member records EXIT.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#172B4D] font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
