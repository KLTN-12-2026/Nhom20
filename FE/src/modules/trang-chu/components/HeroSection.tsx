import { Link } from 'react-router-dom';
import clinicHeroImage from '@/assets/clinic-hero-v1.png';

export default function HeroSection() {
  return (
    <section className="max-container py-4">
      <div className="row align-items-center g-5" style={{ paddingTop: 40, paddingBottom: 16 }}>
        {/* Text Content */}
        <div className="col-lg-6 animate-fade-in-up">
          <h1 className="text-display-lg text-on-surface mb-4">
            Chăm sóc sức khỏe{' '}
            <br className="d-none d-md-block" />
            <span style={{ color: 'var(--sc-primary)' }}>thông minh,</span>
            <br className="d-none d-md-block" />
            nhanh chóng và tiện lợi
          </h1>
          <p className="text-body-lg text-on-surface-variant mb-4" style={{ maxWidth: 520 }}>
            Đặt lịch khám, theo dõi hàng chờ, quản lý hồ sơ sức khỏe và nhận hỗ trợ
            thông minh trên một nền tảng duy nhất. Trải nghiệm y tế hiện đại, giảm thiểu chờ đợi.
          </p>
          <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
            <Link
              to="/dat-lich"
              className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
            >
              <span className="material-symbols-outlined filled" style={{ fontSize: 20 }}>
                calendar_month
              </span>
              Đặt lịch khám
            </Link>
            <Link
              to="/bang-cho"
              className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                queue
              </span>
              Tra cứu hàng chờ
            </Link>
          </div>
        </div>

        {/* Hero Image */}
        <div className="col-lg-6">
          <div
            className="position-relative rounded-4 overflow-hidden"
            style={{
              height: 480,
              background: `linear-gradient(135deg, var(--sc-surface-container-low), var(--sc-surface-container-high))`,
              border: '1px solid var(--sc-outline-variant)',
              boxShadow: 'var(--sc-shadow-lg)',
            }}
          >
            <img
              src={clinicHeroImage}
              alt="Không gian tiếp đón tại phòng khám Smart Clinic"
              className="w-100 h-100"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
            <div
              className="position-absolute w-100 h-100 top-0 start-0"
              style={{ background: 'linear-gradient(180deg, rgba(8, 31, 73, 0.02), rgba(8, 31, 73, 0.16))', zIndex: 1 }}
            />

            {/* Floating glass card */}
            <div
              className="position-absolute glass rounded-3 p-3 d-flex align-items-center gap-3 animate-bounce-slow"
              style={{ bottom: 32, left: 32, zIndex: 2 }}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--sc-primary-container)',
                }}
              >
                <span className="material-symbols-outlined filled">check_circle</span>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant mb-0">Trạng thái</p>
                <p className="text-label-md text-on-surface fw-semibold mb-0">
                  Đã xác nhận lịch hẹn
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
