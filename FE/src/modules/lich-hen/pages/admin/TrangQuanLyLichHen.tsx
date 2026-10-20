import { useEffect, useMemo, useState } from 'react';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import { doctorApi } from '@/modules/bac-si/api/doctor.api';
import type { Doctor } from '@/modules/bac-si/types/doctor.types';
import { specialtyApi } from '@/modules/chuyen-khoa/api/specialty.api';
import type { Specialty } from '@/modules/chuyen-khoa/types/specialty.types';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import ReceptionistStatCard from '@/modules/tiep-don/components/ReceptionistStatCard';
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
  const [limit, setLimit] = useState(20);
  const query = useMemo<AppointmentQuery>(
    () => ({
      search: filters.search || undefined,
      specialtyId: filters.specialtyId
        ? Number(filters.specialtyId)
        : undefined,
      doctorId: filters.doctorId ? Number(filters.doctorId) : undefined,
      date: filters.date || undefined,
      status: (filters.status as AppointmentStatus) || undefined,
      page,
      limit,
    }),
    [filters, page, limit],
  );
  const {
    appointments,
    stats,
    total,
    totalPages,
    isLoading,
    error,
  } = useAppointments(query);
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

  return (
    <div className="appointment-admin">
      <header className="appointment-admin__header">
        <div>
          <h1>QUẢN LÝ LỊCH HẸN</h1>
          <p>Theo dõi và xử lý các yêu cầu đặt lịch của phòng khám.</p>
        </div>
        <div className="d-flex gap-3 mb-0" style={{ flex: '1 1 auto', maxWidth: '850px', justifyContent: 'flex-end', justifyItems: 'stretch' }}>
          <ReceptionistStatCard
            icon="calendar_today"
            label="Tổng lịch hôm nay"
            value={stats.total}
            tone="blue"
          />
          <ReceptionistStatCard
            icon="pending_actions"
            label="Chờ xác nhận"
            value={stats.pending}
            tone="amber"
          />
          <ReceptionistStatCard
            icon="check_circle"
            label="Đã xác nhận"
            value={stats.confirmed}
            tone="green"
          />
        </div>
      </header>

      <section className="appointment-admin__filters">
        <label>
          <span className="material-symbols-outlined">search</span>
          <input
            value={draftFilters.search}
            onChange={(event) =>
              setDraftFilters({ ...draftFilters, search: event.target.value })
            }
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
          className="btn btn-success"
          onClick={() => {
            setPage(1);
            setFilters(draftFilters);
          }}
        >
          Áp dụng
        </button>
      </section>

      {error && <div className="alert alert-danger">{error}</div>}

      <section className="reception-card overflow-hidden">
        <div className="table-responsive">
          <table className="table reception-table align-middle mb-0">
            <thead>
              <tr>
                <th>Mã lịch</th>
                <th>Bệnh nhân</th>
                <th>Nguồn đặt</th>
                <th>Chuyên khoa</th>
                <th>Bác sĩ phụ trách</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => {
                const statusTone = appointment.status === 'CHO_XAC_NHAN' ? 'amber' : 
                                  (appointment.status === 'DA_XAC_NHAN' || appointment.status === 'DA_CHECK_IN') ? 'green' : 'red';
                return (
                <tr key={appointment.id}>
                  <td><strong className="text-primary">{appointment.code}</strong></td>
                  <td>
                    <div className="appointment-admin__patient">
                      <span>{getInitials(appointment.patient.fullName)}</span>
                      <div>
                        <strong>{appointment.patient.fullName}</strong>
                        <small>{appointment.patient.phoneNumber}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="reception-badge reception-badge--blue">
                      {APPOINTMENT_SOURCE_LABELS[appointment.source]}
                    </span>
                  </td>
                  <td>{appointment.specialty.name}</td>
                  <td>{appointment.doctor?.fullName ?? 'Chưa chỉ định'}</td>
                  <td>
                    <strong>{appointment.startTime}</strong>
                    <small className="d-block text-secondary">
                      {formatDate(appointment.appointmentDate)}
                    </small>
                  </td>
                  <td>
                    <span className={`reception-badge reception-badge--${statusTone}`}>
                      {statusLabel(appointment.status)}
                    </span>
                  </td>
                  <td>
                    <div className="appointment-admin__actions">
                      <button type="button" title="Chi tiết" onClick={() => openViewDetails(appointment)}>
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {!isLoading && appointments.length === 0 && (
                <tr><td colSpan={8} className="text-center py-5 text-secondary">Chưa có lịch hẹn phù hợp.</td></tr>
              )}
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-5 text-secondary">Đang tải lịch hẹn...</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="appointment-admin__pagination">
          <span>Hiển thị {appointments.length} trong {total} lịch hẹn</span>
          <div>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <strong>{page} / {totalPages}</strong>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
            <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>
        </footer>
      </section>

      {modalMode === 'view' && selected && (
        <AppModal title={`Chi tiết lịch hẹn ${selected.code}`} size="lg" onClose={closeModal}>
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
