import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

import { useAuthStore } from '@/stores/auth.store';

const NAV_LINKS = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Chuyên khoa', href: '/chuyen-khoa' },
  { label: 'Đội ngũ bác sĩ', href: '/doi-ngu-bac-si' },
  { label: 'Dịch vụ', href: '/dich-vu' },
  { label: 'Liên hệ', href: '/lien-he' },
];

export default function Header() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const patientUser = user?.roles.includes('PATIENT') ? user : null;

  return (
    <nav
      className="navbar navbar-expand-lg fixed-top"
      style={{
        minHeight: 72,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--sc-outline-variant)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      }}
    >
      <div className="container d-flex align-items-center justify-content-between" style={{ maxWidth: 1280 }}>
        {/* Brand */}
        <Link className="navbar-brand d-flex align-items-center gap-2 m-0" to="/">
          <span
            className="material-symbols-outlined filled text-primary"
            style={{ fontSize: 32 }}
          >
            medical_services
          </span>
          <span className="text-headline-sm fw-bold text-primary mb-0">Smart Clinic</span>
        </Link>

        {/* Mobile menu button */}
        <button
          className="navbar-toggler border-0"
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span className="material-symbols-outlined">
            {isMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        {/* Navigation links & Actions */}
        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`}>
          <ul className="navbar-nav mx-auto gap-4 mb-3 mb-lg-0">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <li className="nav-item" key={link.href}>
                  <Link
                    className={`nav-link px-0 py-1 position-relative text-body-md fw-semibold ${
                      isActive
                        ? 'text-primary'
                        : 'text-on-surface'
                    }`}
                    to={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    style={{ transition: 'color 0.2s' }}
                  >
                      {link.label}
                      {isActive && (
                        <span
                          className="position-absolute bottom-0 start-0 w-100"
                          style={{
                            height: 2,
                            backgroundColor: 'var(--sc-primary)',
                            borderRadius: 2,
                            transform: 'translateY(8px)'
                          }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Actions */}
            <div className="d-flex align-items-center gap-2">
              {patientUser ? (
                <Link
                  to="/thong-tin-ca-nhan"
                  className="d-flex align-items-center justify-content-center border"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    textDecoration: 'none',
                    backgroundColor: 'var(--sc-surface)',
                    transition: 'all 0.2s',
                  }}
                  title="Thông tin cá nhân"
                >
                  {patientUser.avatarUrl ? (
                    <img
                      src={patientUser.avatarUrl}
                      alt={patientUser.fullName}
                      className="rounded-circle object-fit-cover w-100 h-100"
                    />
                  ) : (
                    <span className="fw-bold text-primary" style={{ fontSize: 16 }}>
                      {patientUser.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
              ) : (
                <Link
                  to="/dang-nhap"
                  className="btn btn-outline-primary fw-semibold d-flex align-items-center justify-content-center"
                  style={{
                    height: 42,
                    padding: '0 24px',
                    borderRadius: 10,
                    fontSize: 15
                  }}
                >
                  Đăng nhập
                </Link>
              )}
              <Link
                to="/dat-lich"
                className="btn btn-primary fw-semibold d-flex align-items-center justify-content-center gap-2"
                style={{
                  height: 42,
                  padding: '0 24px',
                  borderRadius: 10,
                  fontSize: 15
                }}
              >
                <span className="material-symbols-outlined filled" style={{ fontSize: 18, marginTop: -1 }}>
                  calendar_month
                </span>
                Đặt lịch ngay
              </Link>
            </div>
        </div>
      </div>
    </nav>
  );
}
