// Đầu trang điều hành dùng chung cho các vai trò nhân sự đã đăng nhập.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { useAuthStore } from '@/stores/auth.store';
import NotificationBell from '@/modules/thong-bao/components/NotificationBell';

interface DashboardHeaderProps {
  roleLabel: string;
  profilePath: string;
  onToggleSidebar?: () => void;
}

export default function DashboardHeader({
  roleLabel,
  profilePath,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const initials = user?.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    setIsAccountMenuOpen(false);
    clearSession();
    navigate('/dang-nhap', { replace: true });
    showToast('Đăng xuất thành công');
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openAccountPage = (target: string) => {
    setIsAccountMenuOpen(false);
    navigate(target);
  };

  return (
    <header
      className="d-flex justify-content-between align-items-center px-3 px-md-4 sticky-top"
      style={{
        height: 'var(--sc-header-height)',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--sc-outline-variant)',
        zIndex: 40,
      }}
    >
      {/* Nút Hamburger menu trên thiết bị di động / POS */}
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary mobile-menu-btn d-lg-none d-flex align-items-center justify-content-center"
          onClick={onToggleSidebar}
          aria-label="Mở menu điều hướng"
          style={{ width: 38, height: 38, padding: 0, borderRadius: 8 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>menu</span>
        </button>
        <span className="fw-bold text-primary d-lg-none" style={{ fontSize: 16 }}>
          Smart Clinic
        </span>
      </div>

      {/* Right-side actions */}
      <div className="d-flex align-items-center gap-3 gap-md-4">
        {/* Notifications */}
        <NotificationBell />

        {/* Divider and user information */}
        <div
          ref={accountMenuRef}
          className="position-relative"
        >
          <button
            type="button"
            className="btn border-0 d-flex align-items-center gap-3 p-1"
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsAccountMenuOpen((current) => !current)}
          >
            <div className="text-end d-none d-lg-block">
              <div className="fw-semibold" style={{ fontSize: 14 }}>
                {user?.fullName || roleLabel}
              </div>
              <small className="text-secondary">{roleLabel}</small>
            </div>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="rounded-circle object-fit-cover"
                style={{ width: 40, height: 40 }}
              />
            ) : (
              <div
                className="rounded-circle bg-primary-container d-flex align-items-center justify-content-center"
                style={{
                  width: 40,
                  height: 40,
                  color: 'var(--sc-on-primary)',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {initials || 'AD'}
              </div>
            )}
            <span
              className="material-symbols-outlined text-secondary"
              style={{
                fontSize: 20,
                transform: isAccountMenuOpen ? 'rotate(180deg)' : undefined,
                transition: 'transform 0.2s ease',
              }}
            >
              expand_more
            </span>
          </button>

          {isAccountMenuOpen && (
            <div
              role="menu"
              className="position-absolute end-0 mt-2 bg-white border rounded-3 shadow overflow-hidden"
              style={{ width: 280, zIndex: 1050 }}
            >
              <div className="px-3 py-3 border-bottom">
                <div className="fw-semibold">{user?.fullName}</div>
                <small className="text-secondary">{user?.email}</small>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  className="dropdown-item rounded-2 d-flex align-items-center gap-3 py-2"
                  onClick={() =>
                    openAccountPage(profilePath)
                  }
                >
                  <span className="material-symbols-outlined">account_circle</span>
                  Thông tin cá nhân
                </button>
              </div>
              <div className="p-2 border-top">
                <button
                  type="button"
                  role="menuitem"
                  className="dropdown-item rounded-2 d-flex align-items-center gap-3 py-2 text-danger"
                  onClick={handleLogout}
                >
                  <span className="material-symbols-outlined">logout</span>
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
