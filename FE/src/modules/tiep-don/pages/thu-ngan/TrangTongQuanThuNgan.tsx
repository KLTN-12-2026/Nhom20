import { Link } from 'react-router-dom';

import ReceptionistDashboardCharts from '../../components/ReceptionistDashboardCharts';
import ReceptionistPageHeader from '../../components/ReceptionistPageHeader';
import { useFollowUpReminders } from '../../hooks/use-follow-up-reminders';
import { useReceptionDashboard } from '../../hooks/use-reception-dashboard';
import '../../receptionist-workspace.css';

const APPOINTMENT_STATUS: Record<string, { label: string; tone: string }> = {
  CHO_XAC_NHAN: { label: 'Chờ xác nhận', tone: 'amber' },
  DA_XAC_NHAN: { label: 'Đã xác nhận', tone: 'blue' },
  DA_CHECK_IN: { label: 'Đã check-in', tone: 'green' },
  DA_TU_CHOI: { label: 'Đã từ chối', tone: 'red' },
  DA_HUY: { label: 'Đã hủy', tone: 'red' },
  KHONG_DEN: { label: 'Không đến', tone: 'red' },
};

function initials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('');
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function TrangTongQuanThuNgan() {
  const {
    followUps,
    isLoading: isLoadingFollowUps,
    error: followUpError,
  } = useFollowUpReminders();
  const {
    dashboard,
    isLoading: isLoadingDashboard,
    error: dashboardError,
  } = useReceptionDashboard();

  return (
    <div className="reception-page">
      <ReceptionistPageHeader
        eyebrow="Hệ thống điều phối"
        title="Tổng quan"
        description="Theo dõi nhanh hoạt động tiếp đón, lịch hẹn và hàng đợi trong ca trực."
        actions={
          <>
            <Link className="btn btn-outline-primary" to="/thu-ngan/ca-truc">
              <span className="material-symbols-outlined me-2">description</span>
              Báo cáo ca
            </Link>
            <Link className="btn btn-primary" to="/thu-ngan/tiep-don">
              <span className="material-symbols-outlined me-2">person_add</span>
              Tiếp đón mới
            </Link>
          </>
        }
      />

      <ReceptionistDashboardCharts
        dashboard={dashboard}
        isLoading={isLoadingDashboard}
        error={dashboardError}
      />

      <section className="reception-card reception-follow-up mb-3">
        <div className="reception-card__header">
          <div>
            <h2><span className="material-symbols-outlined text-primary">event_repeat</span>Nhắc tái khám</h2>
            <small className="text-secondary">Danh sách từ hồ sơ khám đã hoàn tất có ngày tái khám hôm nay hoặc ngày mai.</small>
          </div>
          <Link to="/thu-ngan/benh-nhan" className="btn btn-sm btn-outline-primary">Xem hồ sơ bệnh nhân</Link>
        </div>
        {followUpError ? <p className="reception-follow-up__error mb-0">{followUpError}</p> : null}
        <div className="reception-follow-up__grid">
          {[
            { label: 'Hôm nay', items: followUps.today },
            { label: 'Ngày mai', items: followUps.tomorrow },
          ].map((group) => (
            <div className="reception-follow-up__column" key={group.label}>
              <div className="reception-follow-up__heading"><strong>{group.label}</strong><span>{group.items.length}</span></div>
              {isLoadingFollowUps ? (
                <div className="reception-follow-up__empty">Đang tải danh sách...</div>
              ) : group.items.length ? (
                group.items.map((item) => (
                  <article className="reception-follow-up__item" key={item.recordId}>
                    <div>
                      <strong>{item.patient.fullName}</strong>
                      <small>{item.patient.code} · {item.patient.phoneNumber}</small>
                      <small>{item.specialty.name} · BS. {item.doctor.fullName}</small>
                    </div>
                    <Link aria-label={`Mở hồ sơ ${item.patient.fullName}`} className="btn btn-sm btn-light border" to="/thu-ngan/benh-nhan"><span className="material-symbols-outlined">open_in_new</span></Link>
                  </article>
                ))
              ) : <div className="reception-follow-up__empty">Chưa có lịch tái khám.</div>}
            </div>
          ))}
        </div>
      </section>

      <div className="reception-grid">
        <section className="reception-card overflow-hidden">
          <div className="reception-card__header">
            <h2><span className="material-symbols-outlined text-primary">schedule</span>Lịch hẹn sắp tới</h2>
            <Link to="/thu-ngan/lich-hen" className="btn btn-sm btn-link">Xem tất cả</Link>
          </div>
          <div className="table-responsive">
            <table className="table reception-table">
              <thead><tr><th>Bệnh nhân</th><th>Thời gian</th><th>Bác sĩ</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {isLoadingDashboard ? (
                  <tr><td className="reception-empty" colSpan={5}>Đang tải lịch hẹn...</td></tr>
                ) : dashboardError ? (
                  <tr><td className="reception-empty text-danger" colSpan={5}>{dashboardError}</td></tr>
                ) : dashboard?.upcomingAppointments.length ? (
                  dashboard.upcomingAppointments.map((appointment) => {
                    const status = APPOINTMENT_STATUS[appointment.status] ?? { label: appointment.status.replaceAll('_', ' '), tone: 'blue' };
                    return <tr key={appointment.id}>
                      <td><div className="reception-person"><span className="reception-person__avatar">{initials(appointment.patient.fullName)}</span><div><strong>{appointment.patient.fullName}</strong><small className="text-nowrap">Mã: {appointment.code} · SĐT: {appointment.patient.phoneNumber}</small></div></div></td>
                      <td className="fw-bold">{appointment.time}<small className="d-block text-secondary fw-normal">{formatDate(appointment.date)}</small></td>
                      <td>{appointment.doctor ? `BS. ${appointment.doctor}` : 'Chưa phân công'}</td>
                      <td><span className={`reception-badge reception-badge--${status.tone}`}>{status.label}</span></td>
                      <td className="text-end"><Link to={`/thu-ngan/lich-hen?search=${encodeURIComponent(appointment.code)}`} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.85rem' }}>Xử lý</Link></td>
                    </tr>;
                  })
                ) : (
                  <tr><td className="reception-empty" colSpan={5}>Chưa có lịch hẹn sắp tới trong 7 ngày.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reception-card">
          <div className="reception-card__header"><h2><span className="material-symbols-outlined text-primary">groups</span>Hàng đợi theo chuyên khoa</h2></div>
          <div className="reception-card__body">
            {isLoadingDashboard ? <div className="reception-empty">Đang tải hàng đợi...</div> : dashboardError ? (
              <div className="reception-empty text-danger">{dashboardError}</div>
            ) : dashboard?.queueBySpecialty.length ? (
              <div className="d-grid gap-3">
                {dashboard.queueBySpecialty.map((item) => (
                  <div className="reception-queue-summary" key={item.specialtyId}>
                    <span className="reception-stat__icon"><span className="material-symbols-outlined">stethoscope</span></span>
                    <div className="flex-grow-1"><strong>{item.specialtyName}</strong><small>Phiếu đang xếp hàng hôm nay</small></div>
                    <b>{item.total}</b>
                  </div>
                ))}
              </div>
            ) : <div className="reception-empty">Chưa có phiếu hàng đợi hôm nay.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
