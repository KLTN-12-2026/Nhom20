import { Link } from 'react-router-dom';
import { useDoctors } from '@/modules/bac-si/hooks/use-doctors';
import { useSpecialties } from '@/modules/chuyen-khoa/hooks/use-specialties';
import { getSpecialtyIcon } from '@/utils/icon-mapper';
import { useRef, useState } from 'react';
import '../public-pages.css';

function initials(name: string) { return name.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase(); }
function portraitPosition(name: string) { return ['Võ Thành Luân', 'Trần Quốc Bảo'].includes(name) ? 'center 18%' : 'center top'; }
function currency(value: number) { return new Intl.NumberFormat('vi-VN').format(value) + ' đ'; }

/** Render sao vàng ngẫu định (4–5 sao) dựa vào id để ổn định */
function renderStars(seed: string | number) {
  const hash = String(seed).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rating = (hash % 2 === 0) ? 5 : 4; // 4 hoặc 5 sao
  const halfStar = hash % 3 === 0;          // đôi khi thêm nửa sao
  return { rating, halfStar };
}

function StarRating({ seed }: { seed: string | number }) {
  const { rating, halfStar } = renderStars(seed);
  const display = halfStar && rating < 5 ? rating + 0.5 : rating;
  return (
    <span className="hd-star-row" aria-label={`${display} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.floor(display);
        const half = !filled && i === Math.ceil(display) && display % 1 !== 0;
        return (
          <span key={i} className={`hd-star${filled ? ' hd-star--full' : half ? ' hd-star--half' : ''}`}>
            ★
          </span>
        );
      })}
      <small className="hd-star-count ms-1">({display}/5)</small>
    </span>
  );
}

/** Slider dùng cuộn ngang + nút mũi tên */
function CardSlider({ children, itemWidth = 270 }: { children: React.ReactNode[]; itemWidth?: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const scroll = (dir: 'prev' | 'next') => {
    const el = trackRef.current;
    if (!el) return;
    const delta = (itemWidth + 20) * 2;
    el.scrollBy({ left: dir === 'next' ? delta : -delta, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  return (
    <div className="hd-slider-wrap">
      <button
        className={`hd-slider-btn hd-slider-btn--prev${canPrev ? '' : ' hd-slider-btn--disabled'}`}
        onClick={() => scroll('prev')}
        aria-label="Trang trước"
        disabled={!canPrev}
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </button>

      <div className="hd-slider-track" ref={trackRef} onScroll={onScroll}>
        {children.map((child, i) => (
          <div key={i} className="hd-slider-item" style={{ minWidth: itemWidth }}>
            {child}
          </div>
        ))}
      </div>

      <button
        className={`hd-slider-btn hd-slider-btn--next${canNext ? '' : ' hd-slider-btn--disabled'}`}
        onClick={() => scroll('next')}
        aria-label="Trang sau"
        disabled={!canNext}
      >
        <span className="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  );
}

export default function HomeDirectorySections() {
  const specialtyState = useSpecialties();
  const doctorState = useDoctors();

  const specialties = specialtyState.specialties.filter((item) => item.status === 'DANG_HOAT_DONG');
  const doctors = doctorState.doctors.filter((item) => item.status === 'DANG_HOAT_DONG');

  /* Hiển thị dạng grid 4 cột nếu ≤ 4, còn lại dùng slider */
  const useSlider = specialties.length > 4;
  const useDoctorSlider = doctors.length > 4;

  return <>
    {/* ======= SECTION CHUYÊN KHOA ======= */}
    <section className="home-directory-section">
      <div className="container">
        <div className="home-section-heading">
          <div>
            <span className="public-directory-hero__eyebrow text-primary">Chuyên khoa</span>
            <h2>Chăm sóc đúng nhu cầu</h2>
            <p className="text-secondary mb-0">Thông tin và mức phí được cập nhật trực tiếp từ hệ thống.</p>
          </div>
          <Link className="btn btn-primary" to="/chuyen-khoa">Xem tất cả chuyên khoa</Link>
        </div>

        {specialtyState.isLoading && (
          <div className="public-page-empty">
            <div className="spinner-border text-primary" />Đang tải chuyên khoa...
          </div>
        )}

        {!specialtyState.isLoading && specialties.length > 0 && (
          useSlider ? (
            /* ---- Chế độ SLIDER khi có nhiều chuyên khoa ---- */
            <CardSlider itemWidth={260}>
              {specialties.map((item) => (
                <article className="public-info-card hd-specialty-card" key={item.id}>
                  <div className="public-info-card__icon">
                    <span className="material-symbols-outlined">{getSpecialtyIcon(item.name)}</span>
                  </div>
                  <span className="public-info-card__kicker">{item.doctorCount} bác sĩ tiếp nhận</span>
                  <h3>{item.name}</h3>
                  <p>{item.description || `Khám và điều trị chuyên khoa ${item.name}.`}</p>
                  <StarRating seed={item.id} />
                  <div className="public-info-card__footer">
                    <span className="public-info-card__price">{currency(item.examinationFee)}</span>
                    <Link className="btn btn-sm btn-primary" to={`/dat-lich?chuyenKhoaId=${item.id}`}>Đặt lịch</Link>
                  </div>
                </article>
              ))}
            </CardSlider>
          ) : (
            /* ---- Chế độ GRID 4 cột khi ≤ 4 chuyên khoa ---- */
            <div className="public-card-grid">
              {specialties.map((item) => (
                <article className="public-info-card hd-specialty-card" key={item.id}>
                  <div className="public-info-card__icon">
                    <span className="material-symbols-outlined">{getSpecialtyIcon(item.name)}</span>
                  </div>
                  <span className="public-info-card__kicker">{item.doctorCount} bác sĩ tiếp nhận</span>
                  <h3>{item.name}</h3>
                  <p>{item.description || `Khám và điều trị chuyên khoa ${item.name}.`}</p>
                  <StarRating seed={item.id} />
                  <div className="public-info-card__footer">
                    <span className="public-info-card__price">{currency(item.examinationFee)}</span>
                    <Link className="btn btn-sm btn-primary" to={`/dat-lich?chuyenKhoaId=${item.id}`}>Đặt lịch</Link>
                  </div>
                </article>
              ))}
            </div>
          )
        )}
      </div>
    </section>

    {/* ======= SECTION BÁC SĨ ======= */}
    <section className="home-directory-section home-directory-section--tint">
      <div className="container">
        <div className="home-section-heading">
          <div>
            <span className="public-directory-hero__eyebrow text-primary">Đội ngũ bác sĩ</span>
            <h2>Chuyên môn rõ ràng, thông tin minh bạch</h2>
            <p className="text-secondary mb-0">Chọn bác sĩ theo đúng chuyên khoa bạn cần.</p>
          </div>
          <Link className="btn btn-primary" to="/doi-ngu-bac-si">Xem toàn bộ bác sĩ</Link>
        </div>
        {doctorState.isLoading && (
          <div className="public-page-empty"><div className="spinner-border text-primary" />Đang tải bác sĩ...</div>
        )}
        {!doctorState.isLoading && doctors.length > 0 && (
          useDoctorSlider ? (
            <CardSlider itemWidth={260}>
              {doctors.map((doctor) => (
                <article className="public-info-card public-doctor-card" key={doctor.id}>
                  <div className="public-doctor-card__portrait">
                    {doctor.avatarUrl ? <>
                      <img src={doctor.avatarUrl} alt={doctor.fullName} style={{ objectPosition: portraitPosition(doctor.fullName) }}
                        onError={(event) => { event.currentTarget.classList.add('d-none'); event.currentTarget.nextElementSibling?.classList.remove('d-none'); }} />
                      <span className="public-doctor-card__initials d-none">{initials(doctor.fullName)}</span>
                    </> : <span className="public-doctor-card__initials">{initials(doctor.fullName)}</span>}
                  </div>
                  <div className="public-doctor-card__body">
                    <span className="public-info-card__kicker">{doctor.specialty.name}</span>
                    <h3>{doctor.fullName}</h3>
                    <div className="public-doctor-card__meta">
                      <span>{doctor.experienceYears} năm kinh nghiệm</span>
                    </div>
                    <Link className="btn btn-primary mt-auto" to={`/dat-lich?chuyenKhoaId=${doctor.specialty.id}`}>Đặt lịch khám</Link>
                  </div>
                </article>
              ))}
            </CardSlider>
          ) : (
            <div className="public-card-grid">
              {doctors.map((doctor) => (
                <article className="public-info-card public-doctor-card" key={doctor.id}>
                  <div className="public-doctor-card__portrait">
                    {doctor.avatarUrl ? <>
                      <img src={doctor.avatarUrl} alt={doctor.fullName} style={{ objectPosition: portraitPosition(doctor.fullName) }}
                        onError={(event) => { event.currentTarget.classList.add('d-none'); event.currentTarget.nextElementSibling?.classList.remove('d-none'); }} />
                      <span className="public-doctor-card__initials d-none">{initials(doctor.fullName)}</span>
                    </> : <span className="public-doctor-card__initials">{initials(doctor.fullName)}</span>}
                  </div>
                  <div className="public-doctor-card__body">
                    <span className="public-info-card__kicker">{doctor.specialty.name}</span>
                    <h3>{doctor.fullName}</h3>
                    <div className="public-doctor-card__meta">
                      <span>{doctor.experienceYears} năm kinh nghiệm</span>
                    </div>
                    <Link className="btn btn-outline-primary mt-auto" to={`/dat-lich?chuyenKhoaId=${doctor.specialty.id}`}>Đặt lịch khám</Link>
                  </div>
                </article>
              ))}
            </div>
          )
        )}
      </div>
    </section>

    {/* ======= SECTION LIÊN HỆ ======= */}
    <section className="home-directory-section">
      <div className="container">
        <div className="public-contact-banner">
          <div>
            <span className="public-directory-hero__eyebrow">Hỗ trợ người bệnh</span>
            <h2 className="h3 fw-bold mt-2 mb-0">Cần hỗ trợ trước khi đến khám?</h2>
            <p>Tìm hiểu quy trình đặt lịch, tiếp đón, cấp phiếu và theo dõi hàng chờ.</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link className="btn btn-light text-primary fw-bold" to="/lien-he">Xem hướng dẫn liên hệ</Link>
            <Link className="btn btn-outline-light" to="/dat-lich">Đặt lịch ngay</Link>
          </div>
        </div>
      </div>
    </section>
  </>;
}
