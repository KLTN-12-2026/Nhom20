import { Fragment, useMemo, useState } from 'react';

import DoctorAppointmentTable from '../../components/bac-si/DoctorAppointmentTable';
import { useDoctorAppointments } from '../../hooks/use-doctor-appointments';
import type { AppointmentStatus } from '../../types/appointment.types';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '@/modules/bac-si/doctor-workspace.css';

const APPOINTMENTS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

export default function TrangLichKham() {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useMemo(
    () => ({
      date: date || undefined,
      status: status || undefined,
      search: search.trim() || undefined,
      page,
      limit: APPOINTMENTS_PER_PAGE,
    }),
    [date, page, search, status],
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
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, Math.max(1, totalPages)),
    [currentPage, totalPages],
  );
  const displayedFrom =
    total === 0 ? 0 : (currentPage - 1) * APPOINTMENTS_PER_PAGE + 1;
  const displayedTo = Math.min(
    currentPage * APPOINTMENTS_PER_PAGE,
    total,
  );

  return (
    <div className="medicine-inventory admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Quản lý lịch khám</p>
          <h1>LỊCH KHÁM BỆNH</h1>
          <p className="admin-management-description">
            Danh sách lịch được lễ tân phân công cho đúng tài khoản bác sĩ.
          </p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-4">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">event_available</span>
            </div>
            <div>
              <div className="doctor-stat__value">{total}</div>
              <div className="doctor-stat__label">Tổng ca theo bộ lọc</div>
            </div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">verified</span>
            </div>
            <div>
              <div className="doctor-stat__value">{stats.confirmed}</div>
              <div className="doctor-stat__label">Đã xác nhận hôm nay</div>
            </div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">hourglass_top</span>
            </div>
            <div>
              <div className="doctor-stat__value">{stats.pending}</div>
              <div className="doctor-stat__label">Chờ xác nhận hôm nay</div>
            </div>
          </div>
        </div>
      </div>

      <section className="doctor-panel overflow-hidden">
        <div className="doctor-filter-bar">
          <div style={{ minWidth: 220, flex: '1 1 260px' }}>
            <label className="form-label fw-semibold" htmlFor="doctor-search">
              Tìm bệnh nhân
            </label>
            <input
              id="doctor-search"
              className="form-control app-search-control"
              placeholder="Tên, số điện thoại hoặc mã lịch..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <label className="form-label fw-semibold" htmlFor="doctor-date">
              Ngày khám
            </label>
            <input
              id="doctor-date"
              type="date"
              className="form-control"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ minWidth: 190 }}>
            <label className="form-label fw-semibold" htmlFor="doctor-status">
              Trạng thái
            </label>
            <select
              id="doctor-status"
              className="form-select"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as AppointmentStatus | '');
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="CHO_XAC_NHAN">Chờ xác nhận</option>
              <option value="DA_XAC_NHAN">Đã xác nhận</option>
              <option value="DA_TU_CHOI">Đã từ chối</option>
              <option value="DA_CHECK_IN">Đã cấp phiếu</option>
            </select>
          </div>
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
                <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    aria-label="Trang sau"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
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
