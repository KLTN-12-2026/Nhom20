import { useMemo, useState } from 'react';

import DoctorAppointmentTable from '../../components/bac-si/DoctorAppointmentTable';
import { useDoctorAppointments } from '../../hooks/use-doctor-appointments';
import type { AppointmentStatus } from '../../types/appointment.types';
import '@/modules/bac-si/doctor-workspace.css';

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
      limit: 10,
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
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }, [page, totalPages]);

  return (
    <div className="doctor-page">
      <div className="mb-4">
        <div className="doctor-page__eyebrow">Lịch trình làm việc</div>
        <h1 className="doctor-page__title">Lịch khám chi tiết</h1>
        <p className="doctor-page__description">
          Danh sách lịch được lễ tân phân công cho đúng tài khoản bác sĩ.
        </p>
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

        <div className="doctor-pagination">
          <span className="text-secondary small">
            Trang {page}/{totalPages} · {total} lịch khám
          </span>
          <div className="btn-group" aria-label="Phân trang lịch khám">
            <button
              className="btn btn-outline-primary"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              aria-label="Trang trước"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                aria-current={pageNumber === page ? 'page' : undefined}
                className={`btn ${pageNumber === page ? 'btn-primary' : 'btn-outline-primary'}`}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              className="btn btn-outline-primary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Trang sau"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
