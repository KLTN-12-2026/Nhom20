import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import DoctorAppointmentTable from '@/modules/lich-hen/components/bac-si/DoctorAppointmentTable';
import { useDoctorAppointments } from '@/modules/lich-hen/hooks/use-doctor-appointments';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
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
      </section>
    </div>
  );
}

