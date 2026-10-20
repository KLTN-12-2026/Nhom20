import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import DoctorAppointmentTable from '@/modules/lich-hen/components/bac-si/DoctorAppointmentTable';
import { useDoctorAppointments } from '@/modules/lich-hen/hooks/use-doctor-appointments';

import '../../doctor-workspace.css';

function localDateValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function TrangTongQuanBacSi() {
  const query = useMemo(
    () => ({ date: localDateValue(), page: 1, limit: 5 }),
    [],
  );
  const {
    appointments,
    stats,
    isLoading,
    error,
    reload,
  } = useDoctorAppointments(query);
  const checkedIn = appointments.filter(
    (appointment) => appointment.status === 'DA_CHECK_IN',
  ).length;

  return (
    <div className="doctor-page">
      <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
        <div>
          <div className="doctor-page__eyebrow">Bảng điều khiển bác sĩ</div>
          <h1 className="doctor-page__title">Tổng quan hôm nay</h1>
          <p className="doctor-page__description">
            Theo dõi lịch khám và bệnh nhân đã được lễ tân tiếp nhận.
          </p>
        </div>
        <Link
          to="/bac-si/hang-doi"
          className="btn btn-primary align-self-start d-flex align-items-center gap-2"
        >
          <span className="material-symbols-outlined">groups</span>
          Mở hàng đợi
        </Link>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">calendar_today</span>
            </div>
            <div>
              <div className="doctor-stat__value">{stats.total}</div>
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
              <div className="doctor-stat__value">{checkedIn}</div>
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
              <div className="doctor-stat__value">{stats.confirmed}</div>
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
              <div className="doctor-stat__value">{stats.pending}</div>
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
            Lịch khám gần nhất
          </h2>
          <Link to="/bac-si/lich-kham" className="btn btn-sm btn-link">
            Xem toàn bộ
          </Link>
        </div>
        <DoctorAppointmentTable
          appointments={appointments}
          isLoading={isLoading}
          error={error}
          onReload={() => void reload()}
        />
      </section>
    </div>
  );
}

