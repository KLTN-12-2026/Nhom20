import { useNavigate } from 'react-router-dom';

import type {
  Appointment,
  AppointmentStatus,
} from '../../types/appointment.types';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Chờ check-in',
  DA_CHECK_IN: 'Đã check-in',
  DA_TU_CHOI: 'Đã từ chối',
  DA_HUY: 'Đã hủy',
  KHONG_DEN: 'Không đến',
};

function statusClass(status: AppointmentStatus) {
  if (status === 'DA_CHECK_IN') return 'doctor-status--ready';
  if (status === 'DA_XAC_NHAN' || status === 'CHO_XAC_NHAN') {
    return 'doctor-status--waiting';
  }
  return status === 'DA_HUY' || status === 'DA_TU_CHOI'
    ? 'doctor-status--cancelled'
    : 'doctor-status--done';
}

function patientInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatTime(value: string) {
  const time = value.includes('T') ? value.slice(11, 16) : value.slice(0, 5);
  return time || '--:--';
}

interface DoctorAppointmentTableProps {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  showQueueNumber?: boolean;
  onReload: () => void;
}

export default function DoctorAppointmentTable({
  appointments,
  isLoading,
  error,
  showQueueNumber = false,
  onReload,
}: DoctorAppointmentTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="doctor-empty">
        <div className="spinner-border text-primary mb-3" role="status" />
        <div>Đang tải lịch khám...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="doctor-empty">
        <span className="material-symbols-outlined">error</span>
        <p className="mb-3 text-danger">{error}</p>
        <button className="btn btn-outline-primary" onClick={onReload}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!appointments.length) {
    return (
      <div className="doctor-empty">
        <span className="material-symbols-outlined">event_busy</span>
        <strong>Chưa có bệnh nhân phù hợp</strong>
        <div className="mt-1">Danh sách sẽ cập nhật khi lễ tân xác nhận.</div>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table
        className="table doctor-table align-middle mb-0"
        style={{ tableLayout: 'fixed', minWidth: '950px', width: '100%' }}
      >
        <colgroup>
          {showQueueNumber && <col style={{ width: '8%', minWidth: '70px' }} />}
          <col style={{ width: showQueueNumber ? '12%' : '14%', minWidth: '110px' }} />
          <col style={{ width: showQueueNumber ? '28%' : '30%', minWidth: '220px' }} />
          <col style={{ width: showQueueNumber ? '26%' : '28%', minWidth: '200px' }} />
          <col style={{ width: showQueueNumber ? '13%' : '14%', minWidth: '130px' }} />
          <col style={{ width: showQueueNumber ? '13%' : '14%', minWidth: '140px' }} />
        </colgroup>
        <thead>
          <tr>
            {showQueueNumber && <th style={{ width: '8%', minWidth: '70px' }}>STT</th>}
            <th style={{ width: showQueueNumber ? '12%' : '14%', minWidth: '110px' }}>Thời gian</th>
            <th style={{ width: showQueueNumber ? '28%' : '30%', minWidth: '220px' }}>Bệnh nhân</th>
            <th style={{ width: showQueueNumber ? '26%' : '28%', minWidth: '200px' }}>Lý do khám</th>
            <th style={{ width: showQueueNumber ? '13%' : '14%', minWidth: '130px' }}>Trạng thái</th>
            <th className="text-end" style={{ width: showQueueNumber ? '13%' : '14%', minWidth: '140px' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment, index) => (
            <tr key={appointment.id}>
              {showQueueNumber && (
                <td>
                  <span className="doctor-queue-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </td>
              )}
              <td className="fw-bold text-primary">
                {formatTime(appointment.startTime)}
              </td>
              <td>
                <div className="doctor-patient">
                  <div className="doctor-patient__avatar">
                    {patientInitials(appointment.patient.fullName)}
                  </div>
                  <div>
                    <div className="doctor-patient__name">
                      {appointment.patient.fullName}
                    </div>
                    <div className="doctor-patient__meta">
                      {appointment.patient.code} · {appointment.patient.phoneNumber}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ maxWidth: 360 }}>
                <div className="text-truncate">
                  {appointment.reason || 'Chưa ghi nhận lý do khám'}
                </div>
              </td>
              <td>
                <span
                  className={`doctor-status ${statusClass(appointment.status)}`}
                >
                  {STATUS_LABELS[appointment.status]}
                </span>
              </td>
              <td className="text-end">
                {appointment.status === 'DA_CHECK_IN' ? (
                  <button
                    className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                    onClick={() =>
                      navigate(`/bac-si/kham-benh?lichHenId=${appointment.id}`)
                    }
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18 }}
                    >
                      stethoscope
                    </span>
                    Khám bệnh
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled
                    title="Lễ tân cần check-in bệnh nhân trước"
                  >
                    Chờ tiếp nhận
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

