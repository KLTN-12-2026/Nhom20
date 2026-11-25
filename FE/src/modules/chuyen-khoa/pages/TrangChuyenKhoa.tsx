import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import '@/modules/trang-chu/public-pages.css';

import { useSpecialties } from '../hooks/use-specialties';
import { getSpecialtyIcon } from '@/utils/icon-mapper';

const SPECIALTIES_PER_PAGE = 8;

function currency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

function getPageNumbers(currentPage: number, totalPages: number) {
  return [
    ...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]),
  ]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

export default function TrangChuyenKhoa() {
  const { specialties, isLoading, error, reload } = useSpecialties();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const items = useMemo(() => {
    const key = search.trim().toLocaleLowerCase('vi');
    return specialties.filter(
      (item) =>
        item.status === 'DANG_HOAT_DONG' &&
        (!key || item.name.toLocaleLowerCase('vi').includes(key)),
    );
  }, [specialties, search]);

  const totalPages = Math.max(1, Math.ceil(items.length / SPECIALTIES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const visibleSpecialties = useMemo(
    () =>
      items.slice(
        (currentPage - 1) * SPECIALTIES_PER_PAGE,
        currentPage * SPECIALTIES_PER_PAGE,
      ),
    [currentPage, items],
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

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
            Chăm sóc theo chuyên khoa
          </span>
          <h1>Chọn đúng chuyên khoa, gặp đúng bác sĩ</h1>
          <p>
            Tra cứu chuyên khoa đang hoạt động, đội ngũ phụ trách và mức phí khám trước khi đặt lịch.
          </p>
        </div>
      </section>

      <div className="container public-directory-content">
        <div className="public-directory-toolbar">
          <div className="public-directory-search">
            <span className="material-symbols-outlined">search</span>
            <input
              className="form-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm chuyên khoa..."
            />
          </div>
          <span className="text-secondary small px-2">
            {items.length} chuyên khoa đang tiếp nhận
          </span>
        </div>

        <div className="public-card-grid">
          {isLoading && (
            <div className="public-page-empty">
              <div className="spinner-border text-primary" />
              Đang tải chuyên khoa...
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
            visibleSpecialties.map((item) => (
              <article className="public-info-card" key={item.id}>
                <div className="public-info-card__icon">
                  <span className="material-symbols-outlined">
                    {getSpecialtyIcon(item.name)}
                  </span>
                </div>
                <span className="public-info-card__kicker">
                  Mã chuyên khoa {item.code}
                </span>
                <h2>{item.name}</h2>
                <p>
                  {item.description ||
                    `Khám và tư vấn chuyên khoa ${item.name}.`}
                </p>
                <div className="public-info-card__footer">
                  <div>
                    <small className="d-block text-secondary">Phí khám từ</small>
                    <span className="public-info-card__price">
                      {currency(item.examinationFee)}
                    </span>
                  </div>
                  <span className="badge text-bg-light">
                    {item.doctorCount} bác sĩ
                  </span>
                </div>
                <Link
                  className="btn btn-primary mt-3"
                  to={`/dat-lich?chuyenKhoaId=${item.id}`}
                >
                  Đặt lịch chuyên khoa
                </Link>
              </article>
            ))}
          {!isLoading && !error && !items.length && (
            <div className="public-page-empty">
              Không tìm thấy chuyên khoa phù hợp.
            </div>
          )}
        </div>

        {!isLoading && !error && items.length > 0 && (
          <nav
            className="d-flex justify-content-center mt-4"
            aria-label="Phân trang chuyên khoa"
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
