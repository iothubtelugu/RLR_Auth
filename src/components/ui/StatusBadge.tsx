import React from 'react';

interface StatusBadgeProps {
  type: 'action' | 'status' | 'device' | 'category' | 'source';
  value: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm font-medium';
  const val = (value || '').toUpperCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'action') {
    if (val === 'ENTRY') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
    } else if (val === 'EXIT') {
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
    }
  } else if (type === 'status') {
    if (val === 'ACTIVE' || val === 'COMPLETED' || val === 'ONLINE') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (val === 'INACTIVE' || val === 'SUSPENDED' || val === 'OFFLINE' || val === 'ERROR') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (val === 'DEMO' || val === 'MANUALLY_CLOSED') {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    }
  } else if (type === 'source') {
    if (val.includes('HARDWARE')) {
      colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (val.includes('DEMO')) {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (val.includes('MANUAL')) {
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
    }
  } else if (type === 'category') {
    if (val.includes('COORDINATOR')) {
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
    } else if (val.includes('CORE')) {
      colorClasses = 'bg-cyan-50 text-cyan-700 border-cyan-200 font-medium';
    } else if (val.includes('FACULTY')) {
      colorClasses = 'bg-violet-50 text-violet-700 border-violet-200 font-medium';
    } else {
      colorClasses = 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${sizeClasses} ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {value}
    </span>
  );
};
