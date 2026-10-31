import { Fragment, useEffect, useMemo, useState } from 'react';

import AppModal from '@/components/ui/AppModal';
import '@/components/ui/admin-crud.css';
import { useAppToast } from '@/components/ui/use-app-toast';
import { doctorApi } from '@/modules/bac-si/api/doctor.api';
import type { Doctor } from '@/modules/bac-si/types/doctor.types';
import { specialtyApi } from '@/modules/chuyen-khoa/api/specialty.api';
import type { Specialty } from '@/modules/chuyen-khoa/types/specialty.types';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/modules/tiep-don/receptionist-workspace.css';

import { useAppointments } from '../../hooks/use-appointments';
import type {
  Appointment,
  AppointmentQuery,
  AppointmentStatus,
} from '../../types/appointment.types';
import { APPOINTMENT_SOURCE_LABELS } from '../../types/appointment.types';
import '../../appointment-admin.css';

type ModalMode = 'view' | null;

const APPOINTMENTS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

const STATUS_OPTIONS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: 'CHO_XAC_NHAN', label: 'Chờ xác nhận' },
  { value: 'DA_XAC_NHAN', label: 'Đã xác nhận' },
  { value: 'DA_TU_CHOI', label: 'Đã từ chối' },
  { value: 'DA_CHECK_IN', label: 'Đã cấp phiếu' },
];

const ALL_STATUS_LABELS: Record<string, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  DA_TU_CHOI: 'Đã từ chối',
  DA_HUY: 'Đã từ chối',
  DA_CHECK_IN: 'Đã cấp phiếu',
  KHONG_DEN: 'Đã từ chối',
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDate(date: string) {
  return dinhDangNgay(date);
}

function statusLabel(status: AppointmentStatus) {
  return ALL_STATUS_LABELS[status] ?? status;
}

export default function TrangQuanLyLichHen() {
  const { showToast } = useAppToast();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [draftFilters, setDraftFilters] = useState({
    search: '',
    specialtyId: '',
    doctorId: '',
    date: '',
    status: '',
  });
  const [filters, setFilters] = useState(draftFilters);
  const [page, setPage] = useState(1);
  const query = useMemo<AppointmentQuery>(
    () => ({
      search: filters.search || undefined,
      specialtyId: filters.specialtyId
        ? Number(filters.specialtyId)
        : undefined,
      doctorId: filters.doctorId ? Number(filters.doctorId) : undefined,
      date: filters.date || undefined,
      status: (filters.status as AppointmentStatus) || undefined,
      limit: 100,
    }),
    [filters],
  );
  const {
    appointments,
    stats,
    total,
    isLoading,
    error,
    reload,
  } = useAppointments(query);

  const totalPages = Math.max(
    1,
    Math.ceil(appointments.length / APPOINTMENTS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    appointments.length === 0
      ? 0
      : (currentPage - 1) * APPOINTMENTS_PER_PAGE + 1;
  const displayedTo = Math.min(
    currentPage * APPOINTMENTS_PER_PAGE,
    appointments.length,
  );
  const visibleAppointments = useMemo(
    () =>
      appointments.slice(
        (currentPage - 1) * APPOINTMENTS_PER_PAGE,
        currentPage * APPOINTMENTS_PER_PAGE,
      ),
    [currentPage, appointments],
  );

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);

  useEffect(() => {
    void Promise.all([specialtyApi.getAll(), doctorApi.getAll()])
      .then(([specialtyResponse, doctorResponse]) => {
        setSpecialties(
          specialtyResponse.data.filter(
            (item) => item.status === 'DANG_HOAT_DONG',
          ),
        );
        setDoctors(
          doctorResponse.data.filter(
            (item) => item.status === 'DANG_HOAT_DONG',
          ),
        );
      })
      .catch((requestError) =>
        showToast(
          getApiErrorMessage(requestError, 'Không thể tải dữ liệu bộ lọc'),
          'danger',
        ),
      );
  }, [showToast]);

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const openViewDetails = (appointment: Appointment) => {
    setSelected(appointment);
    setModalMode('view');
  };

  const handleApplyFilters = () => {
    setPage(1);
    setFilters(draftFilters);
  };

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Quản lý khám chữa bệnh</p>
          <h1>QUẢN LÝ LỊCH HẸN</h1>
          <p className="admin-management-description">Theo dõi và xử lý các yêu cầu đặt lịch của phòng khám.</p>
        </div>
        <div className="admin-management-summary" aria-label="Tổng quan lịch hẹn">
          <span>
            <strong>{total}</strong> lịch hẹn
          </span>
          <span>
            <strong>{stats.pending}</strong> chờ xác nhận
          </span>
          <span>
            <strong>{stats.confirmed}</strong> đã xác nhận
          </span>
        </div>
      </div>

      <section className="appointment-admin__filters">
        <label>
          <span className="material-symbols-outlined">search</span>
          <input
            value={draftFilters.search}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, search: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleApplyFilters();
            }}
            placeholder="Mã lịch, tên hoặc số điện thoại..."
          />
        </label>
        <select
          value={draftFilters.doctorId}
          onChange={(event) =>
            setDraftFilters({ ...draftFilters, doctorId: event.target.value })
          }
        >
          <option value="">Tất cả bác sĩ</option>
          {doctors.map((doctor) => (
            <option value={doctor.id} key={doctor.id}>{doctor.fullName}</option>
          ))}
        </select>
        <select
          value={draftFilters.specialtyId}
          onChange={(event) =>
            setDraftFilters({ ...draftFilters, specialtyId: event.target.value })
          }
        >
          <option value="">Tất cả chuyên khoa</option>
          {specialties.map((specialty) => (
            <option value={specialty.id} key={specialty.id}>{specialty.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={draftFilters.date}
          onChange={(event) =>
            setDraftFilters({ ...draftFilters, date: event.target.value })
          }
        />
        <select
          value={draftFilters.status}
          onChange={(event) =>
            setDraftFilters({ ...draftFilters, status: event.target.value })
          }
        >
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((status) => (
            <option value={status.value} key={status.value}>{status.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleApplyFilters}
        >
          Áp dụng
        </button>
      </section>

      {isLoading && appointments.length === 0 && (
        <div className="admin-crud-empty">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div>Đang tải danh sách lịch hẹn...</div>
        </div>
      )}

      {!isLoading && error && (
        <div className="admin-crud-empty">
          <p className="text-danger">{error}</p>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => void reload()}
          >
            Thử lại
          </button>
        </div>
      )}

      {(!isLoading || appointments.length > 0) && !error && (
        <div className="admin-management-table-card">
          <div className="admin-management-table-heading">
            <div>
              <h2>Danh sách lịch hẹn</h2>
              <p>Hiển thị {appointments.length} kết quả phù hợp</p>
            </div>
          </div>
          <div className="table-responsive">
            <table
              className="table admin-management-table admin-management-table--appointments align-middle mb-0"
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Mã lịch</th>
                  <th style={{ width: '16%' }}>Bệnh nhân</th>
                  <th style={{ width: '11%' }}>Nguồn đặt</th>
                  <th style={{ width: '12%' }}>Chuyên khoa</th>
                  <th style={{ width: '12%' }}>Bác sĩ phụ trách</th>
                  <th style={{ width: '10%' }}>Thời gian</th>
                  <th style={{ width: '13%' }}>Trạng thái</th>
                  <th className="text-end text-nowrap" style={{ width: '12%' }}>
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody style={{ opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                {visibleAppointments.map((appointment) => {
                  const statusTone =
                    appointment.status === 'CHO_XAC_NHAN'
                      ? 'amber'
                      : appointment.status === 'DA_XAC_NHAN' ||
                          appointment.status === 'DA_CHECK_IN'
                        ? 'green'
                        : 'red';
                  return (
                    <tr key={appointment.id}>
                      <td>
                        <span className="fw-semibold text-primary">{appointment.code}</span>
                      </td>
                      <td>
                        <div className="admin-management-entity">
                          <span
                            className="doctor-card__avatar flex-shrink-0"
                            style={{ width: 34, height: 34, fontSize: '0.8rem' }}
                          >
                            {getInitials(appointment.patient.fullName)}
                          </span>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <strong
                              className="text-truncate d-block"
                              title={appointment.patient.fullName}
                            >
                              {appointment.patient.fullName}
                            </strong>
                            <small className="text-secondary d-block text-truncate">
                              {appointment.patient.phoneNumber}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="reception-badge reception-badge--blue text-nowrap">
                          {APPOINTMENT_SOURCE_LABELS[appointment.source]}
                        </span>
                      </td>
                      <td>
                        <div className="text-truncate" title={appointment.specialty.name}>
                          {appointment.specialty.name}
                        </div>
                      </td>
                      <td>
                        <div
                          className="text-truncate"
                          title={appointment.doctor?.fullName ?? 'Chưa chỉ định'}
                        >
                          {appointment.doctor?.fullName ?? 'Chưa chỉ định'}
                        </div>
                      </td>
                      <td className="text-nowrap">
                        <strong>{appointment.startTime}</strong>
                        <small className="d-block text-secondary">
                          {formatDate(appointment.appointmentDate)}
                        </small>
                      </td>
                      <td>
                        <span className={`reception-badge reception-badge--${statusTone} text-nowrap`}>
                          {statusLabel(appointment.status)}
                        </span>
                      </td>
                      <td className="text-end text-nowrap" style={{ width: '12%' }}>
                        <div className="admin-crud-actions justify-content-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary text-nowrap"
                            onClick={() => openViewDetails(appointment)}
                          >
                            <span className="material-symbols-outlined">visibility</span>
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleAppointments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-5 text-center text-secondary">
                      Không tìm thấy lịch hẹn phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {appointments.length > 0 && (
            <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
              <span className="text-secondary small">
                Hiển thị {displayedFrom}–{displayedTo} trong tổng số {appointments.length} lịch hẹn
              </span>
              <nav className="align-self-md-auto align-self-start" aria-label="Phân trang lịch hẹn">
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
        </div>
      )}

      {modalMode === 'view' && selected && (
        <AppModal
          title={`Chi tiết lịch hẹn: ${selected.code}`}
          size="lg"
          onClose={closeModal}
          footer={
            <button
              className="btn btn-primary"
              type="button"
              onClick={closeModal}
            >
              Đóng
            </button>
          }
        >
          <dl className="row mb-0 appointment-detail">
            <dt className="col-sm-4">Bệnh nhân</dt><dd className="col-sm-8">{selected.patient.fullName} – {selected.patient.phoneNumber}</dd>
            <dt className="col-sm-4">Email</dt><dd className="col-sm-8">{selected.patient.email || 'Chưa có'}</dd>
            <dt className="col-sm-4">Chuyên khoa</dt><dd className="col-sm-8">{selected.specialty.name}</dd>
            <dt className="col-sm-4">Bác sĩ</dt><dd className="col-sm-8">{selected.doctor?.fullName || 'Chưa chỉ định'}</dd>
            <dt className="col-sm-4">Thời gian</dt><dd className="col-sm-8">{selected.startTime} – {formatDate(selected.appointmentDate)}</dd>
            <dt className="col-sm-4">Nguồn đặt</dt><dd className="col-sm-8">{APPOINTMENT_SOURCE_LABELS[selected.source]}</dd>
            <dt className="col-sm-4">Lý do khám</dt><dd className="col-sm-8">{selected.reason || 'Chưa có'}</dd>
            <dt className="col-sm-4">Ghi chú</dt><dd className="col-sm-8">{selected.note || 'Chưa có'}</dd>
            <dt className="col-sm-4">Trạng thái</dt><dd className="col-sm-8">{statusLabel(selected.status)}</dd>
            {selected.rejectionOrCancellationReason && (
              <>
                <dt className="col-sm-4 text-danger">Lý do từ chối/hủy</dt>
                <dd className="col-sm-8 text-danger">{selected.rejectionOrCancellationReason}</dd>
              </>
            )}
          </dl>
        </AppModal>
      )}
    </div>
  );
}
