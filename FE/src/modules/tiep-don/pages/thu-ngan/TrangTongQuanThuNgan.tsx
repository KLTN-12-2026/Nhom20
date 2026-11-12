import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ReceptionistDashboardCharts from '../../components/ReceptionistDashboardCharts';
import { useFollowUpReminders } from '../../hooks/use-follow-up-reminders';
import { useReceptionDashboard } from '../../hooks/use-reception-dashboard';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '../../receptionist-workspace.css';

const APPOINTMENTS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

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

  const [appointmentPage, setAppointmentPage] = useState(1);

  const upcomingAppointments = useMemo(
    () => dashboard?.upcomingAppointments ?? [],
    [dashboard?.upcomingAppointments],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(upcomingAppointments.length / APPOINTMENTS_PER_PAGE),
  );
  const currentPage = Math.min(appointmentPage, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    upcomingAppointments.length === 0
      ? 0
      : (currentPage - 1) * APPOINTMENTS_PER_PAGE + 1;
  const displayedTo = Math.min(
    currentPage * APPOINTMENTS_PER_PAGE,
    upcomingAppointments.length,
  );
  const paginatedAppointments = useMemo(
    () =>
      upcomingAppointments.slice(
        (currentPage - 1) * APPOINTMENTS_PER_PAGE,
        currentPage * APPOINTMENTS_PER_PAGE,
      ),
    [currentPage, upcomingAppointments],
  );

  return (
    <div className="reception-page medicine-inventory admin-crud-page">
      <header className="admin-crud-heading align-items-end">
        <div>
          <p className="admin-management-eyebrow">Hệ thống điều phối</p>
          <h1>TỔNG QUAN THU NGÂN</h1>
          <p className="admin-management-description">
            Theo dõi và quản lý tổng quan hoạt động thu phí khám bệnh, thanh toán hóa đơn và tình trạng giao dịch trong ca trực.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Link className="btn btn-outline-primary bg-white d-inline-flex align-items-center gap-1" to="/thu-ngan/ca-truc">
            <span className="material-symbols-outlined fs-5">description</span>
            <span>Báo cáo ca</span>
          </Link>
          <Link className="btn btn-primary d-inline-flex align-items-center gap-1 text-white" to="/thu-ngan/tiep-don">
            <span className="material-symbols-outlined fs-5">person_add</span>
            <span>Tiếp đón mới</span>
          </Link>
        </div>
      </header>

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
          <Link to="/thu-ngan/benh-nhan" className="btn btn-sm btn-primary">Xem hồ sơ bệnh nhân</Link>
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
            <Link
              className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 text-white"
              to="/thu-ngan/lich-hen"
            >
              <span>Xem tất cả</span>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                arrow_forward
              </span>
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table reception-table">
              <thead><tr><th>Bệnh nhân</th><th>Thời gian</th><th>Bác sĩ</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {isLoadingDashboard ? (
                  <tr><td className="reception-empty" colSpan={5}>Đang tải lịch hẹn...</td></tr>
                ) : dashboardError ? (
                  <tr><td className="reception-empty text-danger" colSpan={5}>{dashboardError}</td></tr>
                ) : paginatedAppointments.length ? (
                  paginatedAppointments.map((appointment) => {
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
          {!isLoadingDashboard && !dashboardError && upcomingAppointments.length > 0 && (
            <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-3 py-2 border-top">
              <span className="text-secondary small">
                Hiển thị {displayedFrom}–{displayedTo} trong tổng số {upcomingAppointments.length} lịch hẹn
              </span>
              <nav aria-label="Phân trang lịch hẹn">
                <ul className="pagination mb-0 flex-wrap">
                  <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      aria-label="Trang trước"
                      disabled={currentPage <= 1}
                      onClick={() => setAppointmentPage((current) => Math.max(1, current - 1))}
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
                          onClick={() => setAppointmentPage(pageNumber)}
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
                        setAppointmentPage((current) => Math.min(totalPages, current + 1))
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
