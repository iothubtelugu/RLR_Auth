import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-xl border border-[#E2EAF2] my-4 shadow-subtle">
      <div className="w-14 h-14 rounded-2xl bg-[#E5F7FD] text-[#00A9E8] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-[#172B4D] mb-1">{title}</h3>
      <p className="text-sm text-[#64748B] max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-[#073B8C] hover:bg-[#062F70] text-white text-sm font-medium transition shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
