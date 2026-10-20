// Thanh điều hướng bên dùng chung. Mục điều hướng theo khu vực vai trò đang dùng.

import { Link, useLocation } from 'react-router-dom';
import type { MenuItem } from '@/config/menu.config';
import { useAuthStore } from '@/stores/auth.store';
import { isDepartmentHeadEmail } from '@/utils/department-head';

interface DashboardSidebarProps {
  navigationItems: MenuItem[];
  roleLabel: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({
  navigationItems,
  roleLabel,
  isOpen = false,
  onClose,
}: DashboardSidebarProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  return (
    <aside
      className={`app-sidebar-container d-flex flex-column position-fixed start-0 top-0 h-100 ${
        isOpen ? 'sidebar-open' : ''
      }`}
      style={{
        width: 'var(--sc-sidebar-width)',
        backgroundColor: 'var(--sc-surface-container-lowest)',
        borderRight: '1px solid var(--sc-outline-variant)',
        padding: '20px 16px',
        zIndex: 1050,
        overflowY: 'auto',
      }}
    >
      {/* Brand & Mobile close button */}
      <div className="d-flex align-items-center justify-content-between px-2 mb-4">
        <div className="d-flex align-items-center gap-3">
          <span
            className="material-symbols-outlined filled text-primary"
            style={{ fontSize: 32 }}
          >
            medical_services
          </span>
          <div>
            <h1
              className="mb-0 text-primary fw-bold"
              style={{ fontSize: 20, lineHeight: '28px' }}
            >
              Smart Clinic
            </h1>
            <p
              className="mb-0 text-on-surface-variant"
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              {roleLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-lg-none d-flex align-items-center justify-content-center"
          onClick={onClose}
          aria-label="Đóng thanh điều hướng"
          style={{ width: 32, height: 32, padding: 0, borderRadius: 8 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="d-flex flex-column gap-1 flex-grow-1">
        {navigationItems.filter(item => {
          if (!item.departmentHeadOnly) return true;
          return isDepartmentHeadEmail(user?.email);
        }).map((menuItem) => {
          const isAreaRoot =
            menuItem.href.split('/').filter(Boolean).length === 1;
          const isActive =
            location.pathname === menuItem.href ||
            (!isAreaRoot &&
              location.pathname.startsWith(`${menuItem.href}/`));

          return (
            <Link
              key={menuItem.href}
              to={menuItem.href}
              onClick={onClose}
              aria-current={isActive ? 'page' : undefined}
              className={`d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none ${isActive
                  ? 'fw-bold shadow-sm'
                  : 'text-on-surface-variant'
                }`}
              style={{
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.2s ease',
                backgroundColor: isActive
                  ? '#e0ecff'
                  : 'transparent',
                color: isActive
                  ? '#1d4ed8'
                  : '#334155',
                borderLeft: isActive
                  ? '4px solid #1d4ed8'
                  : '4px solid transparent',
                ...(menuItem.pushToBottom ? { marginTop: 'auto' } : {}),
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#1d4ed8';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#334155';
                }
              }}
            >
              <span
                className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}
                style={{ fontSize: 22 }}
              >
                {menuItem.icon}
              </span>
              <span>{menuItem.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
