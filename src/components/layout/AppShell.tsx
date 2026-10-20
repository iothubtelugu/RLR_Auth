'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DemoScanModal } from '../modals/DemoScanModal';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, pageTitle }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [quickScanOpen, setQuickScanOpen] = useState(false);
  const [occupancyCount, setOccupancyCount] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<{ mode: 'demo' | 'hardware'; online: boolean }>({
    mode: 'demo',
    online: true,
  });

  const fetchGlobalStatus = async () => {
    try {
      const res = await fetch('/api/occupancy');
      const data = await res.json();
      if (data.success) {
        setOccupancyCount(data.count);
      }

      const devRes = await fetch('/api/devices');
      const devData = await devRes.json();
      if (devData.success) {
        setDeviceInfo({
          mode: devData.currentMode || 'demo',
          online: devData.activeStatus?.connected ?? true,
        });
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchGlobalStatus();
    // Poll every 10 seconds for real-time live telemetry
    const interval = setInterval(fetchGlobalStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F4FBFF] flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        currentlyInsideCount={occupancyCount}
      />

      {/* Main App Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <Header
          pageTitle={pageTitle}
          onMobileMenuToggle={() => setCollapsed(!collapsed)}
          onOpenQuickScan={() => setQuickScanOpen(true)}
          deviceMode={deviceInfo.mode}
          deviceOnline={deviceInfo.online}
        />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Quick Biometric Scan Trigger Modal */}
      <DemoScanModal
        isOpen={quickScanOpen}
        onClose={() => setQuickScanOpen(false)}
        onScanSuccess={fetchGlobalStatus}
      />
    </div>
  );
};
