// Chân trang công khai: thông tin phòng khám, liên hệ, bản quyền SmartClinic License và liên kết hữu ích.

import { Link } from 'react-router-dom';

const FOOTER_LINKS = [
  { label: 'Chuyên khoa', href: '/chuyen-khoa' },
  { label: 'Đội ngũ bác sĩ', href: '/doi-ngu-bac-si' },
  { label: 'Dịch vụ', href: '/dich-vu' },
  { label: 'Liên hệ', href: '/lien-he' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: 'var(--sc-surface-container-highest)',
        borderTop: '1px solid var(--sc-outline-variant)',
      }}
    >
      <div className="container py-4" style={{ maxWidth: 1280 }}>
        <div className="row g-4 justify-content-between align-items-start">
          {/* Cột 1: Thông tin phòng khám */}
          <div className="col-12 col-md-5">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 26 }}
              >
                medical_services
              </span>
              <span className="text-headline-sm fw-bold text-on-surface">
                Smart Clinic
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-0">
              <strong>Địa chỉ:</strong> 123 Đường Công Nghệ, Quận Smart, TP.Đà Nẵng
            </p>
          </div>

          {/* Cột 2: Thông tin liên hệ */}
          <div className="col-12 col-sm-6 col-md-4">
            <div className="text-label-sm text-uppercase text-on-surface mb-2">
              Thông tin liên hệ
            </div>
            <div className="d-flex flex-column text-body-sm text-on-surface-variant gap-1">
              <div>
                <strong>Số điện thoại liên hệ:</strong>{' '}
                <a
                  href="tel:19001234"
                  className="text-primary text-decoration-none fw-semibold"
                >
                  1900 1234
                </a>
              </div>
              <div>
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:contact@smartclinic.ai"
                  className="text-on-surface text-decoration-none fw-medium"
                  style={{ transition: 'color 0.2s' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--sc-primary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--sc-on-surface)')
                  }
                >
                  contact@smartclinic.ai
                </a>
              </div>
            </div>
          </div>

          {/* Cột 3: Liên kết nhanh */}
          <div className="col-12 col-sm-6 col-md-3">
            <div className="text-label-sm text-uppercase text-on-surface mb-2">
              Liên kết nhanh
            </div>
            <div className="d-flex flex-column text-body-sm gap-1">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-body-sm text-on-surface-variant text-decoration-none"
                  style={{ transition: 'color 0.2s', width: 'fit-content' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--sc-primary)')
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
        </div>

        {/* Dòng bản quyền */}
        <div
          className="pt-3 mt-4 text-center"
          style={{ borderTop: '1px solid rgba(15, 23, 42, 0.12)' }}
        >
          <p className="text-body-sm text-on-surface-variant mb-0">
            © {currentYear} Smart Clinic Management System. Giấy phép bản quyền SmartClinic™ License.
          </p>
        </div>
      </div>
    </footer>
  );
}

