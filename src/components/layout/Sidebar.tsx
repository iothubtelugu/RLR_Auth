'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  UserCheck,
  Fingerprint,
  Sliders,
  ShieldCheck,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Bot,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentlyInsideCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, currentlyInsideCount = 0 }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    {
      label: 'Currently Inside',
      href: '/currently-inside',
      icon: Users,
      badge: currentlyInsideCount > 0 ? currentlyInsideCount : null,
      badgeColor: 'bg-[#16A34A]',
    },
    { label: 'Attendance Log', href: '/attendance', icon: CalendarCheck },
    { label: 'Student Admin', href: '/admin', icon: UserCheck },
    { label: 'Members Directory', href: '/members', icon: Users },
    { label: 'Fingerprint Devices', href: '/devices', icon: Fingerprint },
    { label: 'Settings', href: '/settings', icon: Sliders },
    { label: 'Audit Trail', href: '/audit', icon: ShieldCheck },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 flex flex-col bg-white border-r border-[#E2EAF2] transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2EAF2]">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#073B8C] to-[#1677C8] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Bot className="w-6 h-6 text-[#FFD21C]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#073B8C] leading-none">
                ROBOTICS LAB
              </span>
              <span className="text-[11px] font-semibold text-[#00A9E8] tracking-widest mt-0.5">
                OF RKV (RLR)
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#073B8C] hover:bg-[#F4FBFF] transition hidden md:block"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-[#EBF3FF] text-[#073B8C] font-semibold shadow-sm'
                  : 'text-[#64748B] hover:text-[#073B8C] hover:bg-[#F4FBFF]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-[#073B8C]' : 'text-[#64748B] group-hover:text-[#073B8C]'
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge !== null && item.badge !== undefined && (
                <span
                  className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full text-white ${
                    item.badgeColor || 'bg-[#00A9E8]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Kiosk Action Card */}
      <div className="p-3 border-t border-[#E2EAF2]">
        <Link
          href="/kiosk"
          target="_blank"
          className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#073B8C] to-[#1677C8] text-white text-xs font-semibold hover:opacity-95 transition shadow-sm"
          title="Launch Fullscreen Entrance Kiosk"
        >
          <Maximize2 className="w-4 h-4 flex-shrink-0 text-[#FFD21C]" />
          {!collapsed && <span>Entrance Kiosk</span>}
        </Link>
        {!collapsed && (
          <div className="mt-3 px-2 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>v1.0 • RLR Smart Lab</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" title="System Normal"></span>
          </div>
        )}
      </div>
    </aside>
  );
};
