import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import '@/modules/trang-chu/public-pages.css';

import { useDoctors } from '../hooks/use-doctors';

const DOCTORS_PER_PAGE = 8;

function initials(name: string) {
  return name
    .split(' ')
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function portraitPosition(name: string) {
  return ['Võ Thành Luân', 'Trần Quốc Bảo'].includes(name)
    ? 'center 18%'
    : 'center top';
}

function getPageNumbers(currentPage: number, totalPages: number) {
  return [
    ...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]),
  ]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

export default function TrangDoiNguBacSi() {
  const { doctors, isLoading, error, reload } = useDoctors();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [page, setPage] = useState(1);

  const specialtyNames = [
    ...new Set(doctors.map((item) => item.specialty.name)),
  ];
  const items = useMemo(() => {
    const key = search.trim().toLocaleLowerCase('vi');

    return doctors.filter(
      (item) =>
        item.status === 'DANG_HOAT_DONG' &&
        (!key ||
          `${item.fullName} ${item.specialty.name}`
            .toLocaleLowerCase('vi')
            .includes(key)) &&
        (!specialty || item.specialty.name === specialty),
    );
  }, [doctors, search, specialty]);

  const totalPages = Math.max(1, Math.ceil(items.length / DOCTORS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const visibleDoctors = useMemo(
    () =>
      items.slice(
        (currentPage - 1) * DOCTORS_PER_PAGE,
        currentPage * DOCTORS_PER_PAGE,
      ),
    [currentPage, items],
  );

  useEffect(() => {
    setPage(1);
  }, [search, specialty]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="public-directory-page">
      <section className="public-directory-hero">
        <div className="container public-directory-hero__content">
          <span className="public-directory-hero__eyebrow">
            Đội ngũ chuyên môn
          </span>
          <h1>Bác sĩ đồng hành cùng sức khỏe của bạn</h1>
          <p>
            Thông tin bác sĩ được lấy trực tiếp từ hệ thống chuyên môn của Smart
            Clinic.
          </p>
        </div>
      </section>

      <div className="container public-directory-content">
        <div className="public-directory-toolbar flex-wrap">
          <div className="public-directory-search">
            <span className="material-symbols-outlined">search</span>
            <input
              className="form-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm bác sĩ hoặc chuyên khoa..."
            />
          </div>
          <select
            className="form-select"
            style={{ maxWidth: 240 }}
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
          >
            <option value="">Tất cả chuyên khoa</option>
            {specialtyNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="public-card-grid">
          {isLoading && (
            <div className="public-page-empty">
              <div className="spinner-border text-primary" />Đang tải đội ngũ bác sĩ...
            </div>
          )}
          {error && (
            <div className="public-page-empty">
              <span className="text-danger">{error}</span>
              <button
                className="btn btn-outline-primary"
                onClick={() => void reload()}
              >
                Thử lại
              </button>
            </div>
          )}
          {!isLoading &&
            !error &&
            visibleDoctors.map((doctor) => (
              <article
                className="public-info-card public-doctor-card"
                key={doctor.id}
              >
                <div className="public-doctor-card__portrait">
                  {doctor.avatarUrl ? (
                    <>
                      <img
                        src={doctor.avatarUrl}
                        alt={doctor.fullName}
                        style={{
                          objectPosition: portraitPosition(doctor.fullName),
                        }}
                        onError={(event) => {
                          event.currentTarget.classList.add('d-none');
                          event.currentTarget.nextElementSibling?.classList.remove(
                            'd-none',
                          );
                        }}
                      />
                      <span className="public-doctor-card__initials d-none">
                        {initials(doctor.fullName)}
                      </span>
                    </>
                  ) : (
                    <span className="public-doctor-card__initials">
                      {initials(doctor.fullName)}
                    </span>
                  )}
                </div>
                <div className="public-doctor-card__body">
                  <span className="public-info-card__kicker">
                    {doctor.specialty.name}
                  </span>
                  <h2>
                    {doctor.academicDegree
                      ? `${doctor.academicDegree} ${doctor.fullName}`
                      : `BS. ${doctor.fullName}`}
                  </h2>
                  <div className="public-doctor-card__meta">
                    <span>{doctor.experienceYears} năm kinh nghiệm</span>
                    {doctor.averageRating && (
                      <span>★ {doctor.averageRating.toFixed(1)}</span>
                    )}
                  </div>
                  <p>
                    {doctor.description ||
                      `Bác sĩ phụ trách chuyên khoa ${doctor.specialty.name}.`}
                  </p>
                  <Link
                    className="btn btn-primary mt-auto"
                    to={`/dat-lich?chuyenKhoaId=${doctor.specialty.id}`}
                  >
                    Đặt lịch khám
                  </Link>
                </div>
              </article>
            ))}
          {!isLoading && !error && !items.length && (
            <div className="public-page-empty">
              Không tìm thấy bác sĩ phù hợp.
            </div>
          )}
        </div>

        {!isLoading && !error && items.length > 0 && (
          <nav
            className="d-flex justify-content-center mt-4"
            aria-label="Phân trang đội ngũ bác sĩ"
          >
            <ul className="pagination mb-0 flex-wrap">
              <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  aria-label="Trang trước"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                >
                  <span aria-hidden="true">«</span>
                </button>
              </li>
              {pageNumbers.map((pageNumber, index) => (
                <Fragment key={pageNumber}>
                  {index > 0 &&
                    pageNumber - pageNumbers[index - 1] > 1 && (
                      <li className="page-item disabled" aria-hidden="true">
                        <span className="page-link">…</span>
                      </li>
                    )}
                  <li
                    className={`page-item ${pageNumber === currentPage ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      aria-current={
                        pageNumber === currentPage ? 'page' : undefined
                      }
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  </li>
                </Fragment>
              ))}
              <li
                className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}
              >
                <button
                  type="button"
                  className="page-link"
                  aria-label="Trang sau"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  <span aria-hidden="true">»</span>
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
