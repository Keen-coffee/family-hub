import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { settingsApi } from '../../api/settings';
import { useSettingsStore } from '../../stores/settingsStore';

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
      <main className="flex-1 overflow-hidden flex flex-col md:pb-0 pb-16">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav />}
    </div>
  );
}
