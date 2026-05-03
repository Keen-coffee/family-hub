import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { settingsApi } from '../../api/settings';
import { useSettingsStore } from '../../stores/settingsStore';
import { WifiOff } from 'lucide-react';

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border-b border-amber-500/30 text-amber-300 text-xs shrink-0">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>You're offline — showing cached data. Changes will sync when you reconnect.</span>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { settings, setSettings } = useSettingsStore();
  const isMobile = window.matchMedia('(max-width: 767px)').matches;

  // Sync settings from server on every app load
  useEffect(() => {
    settingsApi.get().then(res => {
      if (res.success && res.data) {
        setSettings({ ...settings, ...res.data });
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-base overflow-hidden pt-safe">
      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col md:pb-0 pb-16">
        <OfflineBanner />
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav />}
    </div>
  );
}
