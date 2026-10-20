// Chân trang công khai: thông tin thương hiệu và liên kết hữu ích.

import { Link } from 'react-router-dom';

const FOOTER_LINKS = [
  { label: 'Chuyên khoa', href: '/chuyen-khoa' },
  { label: 'Đội ngũ bác sĩ', href: '/doi-ngu-bac-si' },
  { label: 'Dịch vụ', href: '/dich-vu' },
  { label: 'Liên hệ', href: '/lien-he' },
];

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--sc-surface-container-highest)',
        borderTop: '1px solid var(--sc-outline-variant)',
      }}
    >
      <div
        className="container d-flex flex-column flex-md-row justify-content-between align-items-start py-5 gap-4"
        style={{ maxWidth: 1280 }}
      >
        {/* Brand */}
        <div>
          <h5 className="text-headline-sm fw-bold text-on-surface mb-2">
            Smart Clinic
          </h5>
          <p className="text-body-sm text-on-surface-variant mb-0">
            © {new Date().getFullYear()} Smart Clinic Management System. Bảo lưu mọi quyền.
          </p>
        </div>

        {/* Links */}
        <div className="d-flex flex-wrap gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-body-sm text-on-surface-variant text-decoration-none"
              style={{ transition: 'color 0.2s' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = 'var(--sc-on-surface)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = 'var(--sc-on-surface-variant)')
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
