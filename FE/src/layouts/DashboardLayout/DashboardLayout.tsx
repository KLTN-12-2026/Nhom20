import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import type { MenuItem } from '@/config/menu.config';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';

interface DashboardLayoutProps {
  navigationItems: MenuItem[];
  roleLabel: string;
  profilePath: string;
}

export default function DashboardLayout({
  navigationItems,
  roleLabel,
  profilePath,
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="d-flex vh-100 overflow-hidden position-relative">
      {/* Lớp phủ mờ backdrop trên thiết bị di động / POS */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <DashboardSidebar
        navigationItems={navigationItems}
        roleLabel={roleLabel}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Khu vực nội dung chính */}
      <div
        className="app-main-content d-flex flex-column flex-grow-1 min-w-0"
        style={{
          backgroundColor: 'var(--sc-background)',
        }}
      >
        <DashboardHeader
          roleLabel={roleLabel}
          profilePath={profilePath}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Current page */}
        <main
          className="flex-grow-1 overflow-auto app-dashboard-main"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
