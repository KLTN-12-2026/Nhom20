import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppToast } from '@/components/ui/use-app-toast';
import { doctorApi } from '@/modules/bac-si/api/doctor.api';
import type { Doctor } from '@/modules/bac-si/types/doctor.types';
import ReceptionistPageHeader from '@/modules/tiep-don/components/ReceptionistPageHeader';
import ReceptionistStatCard from '@/modules/tiep-don/components/ReceptionistStatCard';
import type { ReceptionTicketData } from '@/modules/tiep-don/types/reception-ticket.types';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgay, dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import { useAppointments } from '../../hooks/use-appointments';
import { APPOINTMENT_SOURCE_LABELS, type Appointment, type AppointmentStatus } from '../../types/appointment.types';
import '@/modules/tiep-don/receptionist-workspace.css';

const FILTER_STATUS_OPTIONS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: 'CHO_XAC_NHAN', label: 'Chờ xác nhận' },
  { value: 'DA_XAC_NHAN', label: 'Đã xác nhận' },
  { value: 'DA_TU_CHOI', label: 'Đã từ chối' },
  { value: 'DA_CHECK_IN', label: 'Đã cấp phiếu' },
];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  DA_TU_CHOI: 'Đã từ chối',
  DA_HUY: 'Đã từ chối',
  DA_CHECK_IN: 'Đã cấp phiếu',
  KHONG_DEN: 'Đã từ chối',
};
const STATUS_TONES: Record<AppointmentStatus, string> = {
  CHO_XAC_NHAN: 'amber',
  DA_XAC_NHAN: 'blue',
  DA_TU_CHOI: 'red',
  DA_HUY: 'red',
  DA_CHECK_IN: 'green',
  KHONG_DEN: 'red',
};

function formatDate(value: string) {
  return dinhDangNgay(value);
}

function formatDateText(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join('/');
}

function toIsoDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';
  const [, day, month, year] = match;
  const dateValue = new Date(`${year}-${month}-${day}T00:00:00`);
  if (
    dateValue.getFullYear() !== Number(year) ||
    dateValue.getMonth() + 1 !== Number(month) ||
    dateValue.getDate() !== Number(day)
  ) {
    return '';
  }
  return `${year}-${month}-${day}`;
}

export default function TrangLichHenThuNgan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useAppToast();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [date, setDate] = useState('');
  const [dateText, setDateText] = useState('');
  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('')
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelAction, setCancelAction] = useState<'DA_TU_CHOI' | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const query = useMemo(() => ({ search: search.trim() || undefined, status: status || undefined, date: date || undefined, page, limit: 5 }), [date, page, search, status]);
  const { appointments, stats, total, totalPages, isLoading, error, reload, updateAppointment, checkInAppointment } = useAppointments(query);
  const selected = appointments.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedDoctorId(selected?.doctor?.id ?? '');
  }, [selected?.doctor?.id]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const changePage = (nextPage: number) => {
    setSelectedId(null);
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  const loadAvailableDoctors = async (appointmentDate: string, specialtyId: number) => {
    setIsLoadingDoctors(true);
    try {
      const response = await doctorApi.getAvailable(appointmentDate, specialtyId);
      setAvailableDoctors(response.data);
    } catch {
      setAvailableDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  // Mở modal tiếp nhận lịch hẹn để xác nhận hoặc cấp phiếu
  const openAppointment = (appointment: Appointment) => {
    setSelectedDoctorId(appointment.doctor?.id ?? '');
    setSelectedId(appointment.id);
    setCancelAction(null);
    setCancelReason('');
    void loadAvailableDoctors(appointment.appointmentDate, appointment.specialty.id);
  };

  // Mở modal từ chối tiếp nhận lịch hẹn trực tiếp từ bảng
  const openRejectModal = (appointment: Appointment) => {
    setSelectedDoctorId(appointment.doctor?.id ?? '');
    setSelectedId(appointment.id);
    setCancelAction('DA_TU_CHOI');
    setCancelReason('');
  };

  const closeAppointment = () => {
    setSelectedId(null);
    setCancelAction(null);
    setCancelReason('');
  };

  const confirmAppointment = async (appointment: Appointment) => {
    const doctorId = appointment.doctor?.id ?? selectedDoctorId;
    if (!doctorId) {
      showToast('Vui lòng phân công bác sĩ trước khi xác nhận lịch', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await updateAppointment(appointment.id, { doctorId, status: 'DA_XAC_NHAN' });
      showToast(response.message);
      closeAppointment();
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Không thể xác nhận lịch hẹn'), 'danger');
    } finally { setIsSubmitting(false); }
  };

  const issueTicket = async (appointment: Appointment) => {
    const doctorId = appointment.doctor?.id ?? selectedDoctorId;
    if (!doctorId) {
      showToast('Vui lòng phân công bác sĩ trước khi cấp phiếu', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      if (!appointment.doctor) {
        await updateAppointment(appointment.id, { doctorId });
      }
      const response = await checkInAppointment(appointment.id);
      showToast(response.message);
      closeAppointment();
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Không thể cấp phiếu tiếp đón'), 'danger');
    } finally { setIsSubmitting(false); }
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    if (!cancelAction) return;
    if (!cancelReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await updateAppointment(appointment.id, {
        status: 'DA_TU_CHOI',
        rejectionOrCancellationReason: cancelReason.trim(),
      });
      showToast(response.message);
      closeAppointment();
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Không thể từ chối lịch hẹn'), 'danger');
    } finally { setIsSubmitting(false); }
  };

  const printTicket = (appointment: Appointment) => {
    if (!appointment.ticket) return;
    const ticket: ReceptionTicketData = {
      queueNumber: appointment.ticket.queueNumber,
      patientName: appointment.patient.fullName,
      phoneNumber: appointment.patient.phoneNumber,
      specialty: appointment.specialty.name,
      doctorAndRoom: `${appointment.doctor?.fullName ?? 'Chưa phân công'}${appointment.room ? ` · ${appointment.room.name}` : ''}`,
      priority: 'Thông thường',
      issuedAt: dinhDangNgayGio(appointment.ticket.issuedAt),
    };
    void navigate(`/thu-ngan/tiep-don/phieu/${appointment.ticket.queueNumber}`, { state: ticket });
  };

  return <div className="reception-page">
    <ReceptionistPageHeader eyebrow="Điều phối lịch khám" title="Quản lý lịch hẹn" description="Nhận lịch khách đặt tại nhà, xác nhận và cấp phiếu khi bệnh nhân đến phòng khám." actions={<Link className="btn btn-primary" to="/thu-ngan/tiep-don"><span className="material-symbols-outlined me-2">person_add</span>Tiếp đón trực tiếp</Link>} />
    <div className="reception-stats">
      <ReceptionistStatCard icon="calendar_month" label="Tổng lịch theo bộ lọc" value={total} />
      <ReceptionistStatCard icon="pending_actions" label="Chờ xác nhận hôm nay" value={stats.pending} tone="amber" />
      <ReceptionistStatCard icon="event_available" label="Đã xác nhận hôm nay" value={stats.confirmed} tone="green" />
      <ReceptionistStatCard icon="confirmation_number" label="Đã cấp phiếu hôm nay" value={stats.checkedIn} />
    </div>
    <section className="reception-card overflow-hidden">
      <div className="reception-filter">
        <div className="reception-filter__search"><label className="form-label fw-semibold">Tìm lịch hẹn</label><div className="app-search-field"><span className="material-symbols-outlined">search</span><input className="form-control" placeholder="Mã lịch, tên hoặc số điện thoại..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div></div>
        <div><label className="form-label fw-semibold">Trạng thái</label><select className="form-select" value={status} onChange={(event) => { setStatus(event.target.value as AppointmentStatus | ''); setPage(1); }}><option value="">Tất cả trạng thái</option>{FILTER_STATUS_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div>
        <div>
          <label className="form-label fw-semibold">Ngày khám</label>
          <div className="input-group">
            <input
              className="form-control"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={dateText}
              onChange={(event) => {
                const nextText = formatDateText(event.target.value);
                setDateText(nextText);
                setDate(nextText ? toIsoDate(nextText) : '');
                setPage(1);
              }}
            />
            <button
              type="button"
              className="btn btn-outline-secondary d-flex align-items-center"
              title="Chọn ngày"
              onClick={() => datePickerRef.current?.showPicker?.()}
            >
              <span className="material-symbols-outlined">calendar_month</span>
            </button>
            <input
              ref={datePickerRef}
              className="visually-hidden"
              type="date"
              value={date}
              onChange={(event) => {
                const nextDate = event.target.value;
                setDate(nextDate);
                setDateText(nextDate ? formatDate(nextDate) : '');
                setPage(1);
              }}
              aria-label="Chọn ngày khám"
            />
          </div>
        </div>
      </div>
      {error && <div className="reception-empty"><p>{error}</p><button className="btn btn-outline-primary" onClick={() => void reload()}>Thử lại</button></div>}
      {!error && <div className="table-responsive"><table className="table reception-table"><thead><tr><th>Mã lịch</th><th>Bệnh nhân</th><th>Chuyên khoa</th><th>Bác sĩ</th><th>Thời gian</th><th>Trạng thái</th><th className="text-end">Hành động</th></tr></thead><tbody>
        {appointments.map((appointment) => (
          <tr key={appointment.id}>
            <td className="fw-bold text-primary">{appointment.code}</td>
            <td>
              <strong className="d-block">{appointment.patient.fullName}</strong>
              <small className="text-secondary">{appointment.patient.phoneNumber} · {APPOINTMENT_SOURCE_LABELS[appointment.source]}</small>
            </td>
            <td>{appointment.specialty.name}</td>
            <td>{appointment.doctor?.fullName ?? 'Chưa phân công'}</td>
            <td>
              <strong>{appointment.startTime}</strong>
              <small className="d-block text-secondary">{formatDate(appointment.appointmentDate)}</small>
            </td>
            <td>
              <span className={`reception-badge reception-badge--${STATUS_TONES[appointment.status]}`}>
                {STATUS_LABELS[appointment.status]}
              </span>
            </td>
            <td className="text-end">
              <div className="reception-row-actions">
                <button
                  className="btn btn-sm btn-light border"
                  title="Xem chi tiết"
                  onClick={() => openAppointment(appointment)}
                >
                  <span className="material-symbols-outlined">visibility</span>
                </button>
                {appointment.status === 'CHO_XAC_NHAN' && (
                  <>
                    <button
                      className="btn btn-sm btn-danger reception-action-btn"
                      title="Từ chối lịch hẹn"
                      onClick={() => openRejectModal(appointment)}
                    >
                      Từ chối
                    </button>
                    <button
                      className="btn btn-sm btn-primary reception-action-btn"
                      title="Xác nhận lịch hẹn"
                      onClick={() => openAppointment(appointment)}
                    >
                      Xác nhận
                    </button>
                  </>
                )}
                {appointment.status === 'DA_XAC_NHAN' && (
                  <>
                    <button
                      className="btn btn-sm btn-danger reception-action-btn"
                      title="Từ chối lịch hẹn"
                      onClick={() => openRejectModal(appointment)}
                    >
                      Từ chối
                    </button>
                    <button
                      className="btn btn-sm btn-primary reception-action-btn"
                      title="Cấp phiếu tiếp đón"
                      onClick={() => openAppointment(appointment)}
                    >
                      Cấp phiếu
                    </button>
                  </>
                )}
                {appointment.ticket && (
                  <button
                    className="btn btn-sm btn-outline-dark"
                    title="In phiếu tiếp đón"
                    onClick={() => printTicket(appointment)}
                  >
                    <span className="material-symbols-outlined">print</span>
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {!isLoading && appointments.length === 0 && <tr><td colSpan={7} className="text-center py-5 text-secondary">Chưa có lịch hẹn phù hợp.</td></tr>}{isLoading && <tr><td colSpan={7} className="text-center py-5 text-secondary">Đang tải lịch hẹn...</td></tr>}
      </tbody></table></div>}
      <div className="reception-pagination">
        <small className="text-secondary">Trang {page}/{totalPages} · {total} lịch hẹn</small>
        <div className="btn-group" aria-label="Phân trang lịch hẹn">
          <button type="button" className="btn btn-outline-primary" disabled={page <= 1 || isLoading} onClick={() => changePage(page - 1)} aria-label="Trang trước"><span className="material-symbols-outlined">chevron_left</span></button>
          {(() => {
            let start = Math.max(1, page - 2);
            let end = Math.min(totalPages, page + 2);
            if (end - start < 4) {
              if (start === 1) end = Math.min(totalPages, 5);
              else if (end === totalPages) start = Math.max(1, totalPages - 4);
            }
            return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((pageNumber) => (
              <button
                className={`btn ${pageNumber === page ? 'btn-primary' : 'btn-outline-primary'}`}
                key={pageNumber}
                type="button"
                disabled={isLoading && pageNumber !== page}
                onClick={() => changePage(pageNumber)}
                aria-current={pageNumber === page ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            ));
          })()}
          <button type="button" className="btn btn-outline-primary" disabled={page >= totalPages || isLoading} onClick={() => changePage(page + 1)} aria-label="Trang sau"><span className="material-symbols-outlined">chevron_right</span></button>
        </div>
      </div>
    </section>
    {selected && (
      <div className="modal d-block reception-modal" role="dialog" aria-modal="true">
        <div className="modal-backdrop show reception-modal__backdrop" onClick={closeAppointment} />
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2 className="modal-title fs-5">
                  {cancelAction ? 'Từ chối lịch hẹn' : 'Tiếp nhận lịch hẹn'}
                </h2>
                <small className="text-secondary">{selected.code}</small>
              </div>
              <button className="btn-close" onClick={closeAppointment} />
            </div>
            <div className="modal-body">
              <dl className="row mb-0">
                <dt className="col-5">Bệnh nhân</dt>
                <dd className="col-7">{selected.patient.fullName}</dd>
                <dt className="col-5">Số điện thoại</dt>
                <dd className="col-7">{selected.patient.phoneNumber}</dd>
                <dt className="col-5">Chuyên khoa</dt>
                <dd className="col-7">{selected.specialty.name}</dd>
                <dt className="col-5">Bác sĩ</dt>
                <dd className="col-7">{selected.doctor?.fullName ?? 'Chưa phân công'}</dd>
                <dt className="col-5">Thời gian</dt>
                <dd className="col-7">{selected.startTime} · {formatDate(selected.appointmentDate)}</dd>
                <dt className="col-5">Lý do khám</dt>
                <dd className="col-7">{selected.reason || 'Chưa có'}</dd>
                <dt className="col-5">Trạng thái</dt>
                <dd className="col-7">
                  <span className={`reception-badge reception-badge--${STATUS_TONES[selected.status]}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </dd>
              </dl>

              {!cancelAction && (selected.status === 'CHO_XAC_NHAN' || selected.status === 'DA_XAC_NHAN') && (
                <div className="mt-3">
                  <label className="form-label fw-semibold" htmlFor="appointment-doctor">
                    Bác sĩ tiếp nhận * <small className="text-secondary fw-normal">(chỉ hiển thị bác sĩ đang làm ngày {formatDate(selected.appointmentDate)})</small>
                  </label>
                  {isLoadingDoctors ? (
                    <div className="text-secondary py-2">Đang tải danh sách bác sĩ khả dụng...</div>
                  ) : (
                    <>
                      <select
                        id="appointment-doctor"
                        className="form-select"
                        value={selectedDoctorId}
                        onChange={(event) => setSelectedDoctorId(event.target.value ? Number(event.target.value) : '')}
                      >
                        <option value="">Chọn bác sĩ thuộc {selected.specialty.name}</option>
                        {availableDoctors.map((doctor) => (
                          <option value={doctor.id} key={doctor.id}>{doctor.fullName} · {doctor.academicDegree || 'Bác sĩ'}</option>
                        ))}
                      </select>
                      {availableDoctors.length === 0 && (
                        <small className="text-danger">Không có bác sĩ khả dụng cho ngày này. Kiểm tra lịch làm việc của khoa.</small>
                      )}
                    </>
                  )}
                </div>
              )}

              {!cancelAction && selected.status === 'CHO_XAC_NHAN' && (
                <div className="doctor-note mt-3">Xác nhận lịch trước. Chỉ cấp phiếu khi bệnh nhân đã có mặt tại phòng khám.</div>
              )}
              {!cancelAction && selected.status === 'DA_XAC_NHAN' && (
                <div className="doctor-note mt-3">Bệnh nhân đã được xác nhận. Kiểm tra bệnh nhân có mặt rồi cấp phiếu.</div>
              )}
              {!cancelAction && selected.ticket && (
                <div className="reception-complete mt-3">
                  <span className="material-symbols-outlined">confirmation_number</span>
                  <div>
                    <strong>Đã cấp phiếu {selected.ticket.queueNumber}</strong>
                    <p className="mb-0">Phiếu sẵn sàng mở sang trang in riêng.</p>
                  </div>
                </div>
              )}

              {cancelAction && (
                <div className="mt-3 p-3 bg-light rounded border">
                  <label className="form-label fw-semibold">
                    Lý do từ chối *
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Nhập lý do từ chối..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={closeAppointment}>Đóng</button>

              {!cancelAction && selected.status === 'CHO_XAC_NHAN' && (
                <button
                  className="btn btn-primary"
                  disabled={isSubmitting || !selectedDoctorId || isLoadingDoctors}
                  onClick={() => void confirmAppointment(selected)}
                >
                  Xác nhận lịch
                </button>
              )}

              {!cancelAction && selected.status === 'DA_XAC_NHAN' && (
                <button
                  className="btn btn-primary"
                  disabled={isSubmitting || !selectedDoctorId || isLoadingDoctors}
                  onClick={() => void issueTicket(selected)}
                >
                  Cấp phiếu tiếp đón
                </button>
              )}

              {!cancelAction && selected.ticket && (
                <button className="btn btn-outline-dark" onClick={() => printTicket(selected)}>
                  <span className="material-symbols-outlined me-1">print</span>Mở trang in phiếu
                </button>
              )}

              {cancelAction && (
                <button className="btn btn-outline-secondary" onClick={() => setCancelAction(null)}>Quay lại</button>
              )}

              {cancelAction && (
                <button
                  className="btn btn-danger"
                  disabled={isSubmitting || !cancelReason.trim()}
                  onClick={() => void handleCancelAppointment(selected)}
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>;
}
