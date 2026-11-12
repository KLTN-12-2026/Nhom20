import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import DoctorAppointmentTable from '@/modules/lich-hen/components/bac-si/DoctorAppointmentTable';
import { useDoctorAppointments } from '@/modules/lich-hen/hooks/use-doctor-appointments';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '../../doctor-workspace.css';

const APPOINTMENTS_PER_PAGE = 5;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

function localDateValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function TrangTongQuanBacSi() {
  const [page, setPage] = useState(1);
  const query = useMemo(
    () => ({ date: localDateValue(), page, limit: APPOINTMENTS_PER_PAGE }),
    [page],
  );
  const {
    appointments,
    stats,
    total,
    totalPages,
    isLoading,
    error,
    reload,
  } = useDoctorAppointments(query);
  const statValue = (value: number) => (isLoading ? '…' : error ? '—' : value);

  const effectiveTotalPages = Math.max(1, totalPages);
  const currentPage = Math.min(page, effectiveTotalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, effectiveTotalPages),
    [currentPage, effectiveTotalPages],
  );
  const displayedFrom =
    total === 0 ? 0 : (currentPage - 1) * APPOINTMENTS_PER_PAGE + 1;
  const displayedTo = Math.min(currentPage * APPOINTMENTS_PER_PAGE, total);

  return (
    <div className="medicine-inventory admin-crud-page">
      <header className="admin-crud-heading align-items-end">
        <div>
          <p className="admin-management-eyebrow">Tổng quan hoạt động</p>
          <h1>TỔNG QUAN KHÁM BỆNH</h1>
          <p className="admin-management-description">
            Theo dõi lịch khám, danh sách bệnh nhân được tiếp nhận và tình trạng chờ khám trong ngày.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Link
            to="/bac-si/hang-doi"
            className="btn btn-primary d-flex align-items-center gap-2 text-white"
          >
            <span className="material-symbols-outlined">groups</span>
            Mở hàng đợi
          </Link>
        </div>
      </header>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">calendar_today</span>
            </div>
            <div>
              <div className="doctor-stat__value">{statValue(stats.total)}</div>
              <div className="doctor-stat__label">Lịch khám hôm nay</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">person_check</span>
            </div>
            <div>
              <div className="doctor-stat__value">{statValue(stats.checkedIn)}</div>
              <div className="doctor-stat__label">Đã check-in</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <div>
              <div className="doctor-stat__value">{statValue(stats.confirmed)}</div>
              <div className="doctor-stat__label">Đã xác nhận</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <div>
              <div className="doctor-stat__value">{statValue(stats.pending)}</div>
              <div className="doctor-stat__label">Chờ lễ tân xử lý</div>
            </div>
          </div>
        </div>
      </div>

      <section className="doctor-panel overflow-hidden">
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
          <h2 className="doctor-section-title">
            <span className="material-symbols-outlined text-primary">
              patient_list
            </span>
            Lịch khám hôm nay
          </h2>
          <Link
            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 text-white"
            to="/bac-si/lich-kham"
          >
            <span>Xem tất cả</span>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_forward
            </span>
          </Link>
        </div>
        <DoctorAppointmentTable
          appointments={appointments}
          isLoading={isLoading}
          error={error}
          onReload={() => void reload()}
        />
        {total > 0 && (
          <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
            <span className="text-secondary small">
              Hiển thị {displayedFrom}–{displayedTo} trong tổng số {total} lịch khám
            </span>
            <nav className="align-self-md-auto align-self-start" aria-label="Phân trang lịch khám">
              <ul className="pagination mb-0 flex-wrap">
                <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    aria-label="Trang trước"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <span aria-hidden="true">&laquo;</span>
                  </button>
                </li>
                {pageNumbers.map((pageNumber, index) => (
                  <Fragment key={pageNumber}>
                    {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                      <li className="page-item disabled" aria-hidden="true">
                        <span className="page-link">…</span>
                      </li>
                    )}
                    <li className={`page-item ${pageNumber === currentPage ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        aria-current={pageNumber === currentPage ? 'page' : undefined}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </li>
                  </Fragment>
                ))}
                <li className={`page-item ${currentPage >= effectiveTotalPages ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    aria-label="Trang sau"
                    disabled={currentPage >= effectiveTotalPages}
                    onClick={() =>
                      setPage((current) => Math.min(effectiveTotalPages, current + 1))
                    }
                  >
                    <span aria-hidden="true">&raquo;</span>
                  </button>
                </li>
              </ul>
            </nav>
          </footer>
        )}
      </section>
    </div>
  );
}

