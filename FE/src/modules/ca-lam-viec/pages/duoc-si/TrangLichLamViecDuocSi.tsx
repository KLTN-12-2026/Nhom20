import { useEffect, useState } from 'react';
import { pharmacistSchedulesApi } from '../../api/pharmacist-schedules.api';
import { addScheduleDays, getCurrentMonday } from '../../utils/schedule-date';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '@/modules/bac-si/doctor-workspace.css';

const DAYS = [
  { short: 'T2', label: 'Thứ 2' },
  { short: 'T3', label: 'Thứ 3' },
  { short: 'T4', label: 'Thứ 4' },
  { short: 'T5', label: 'Thứ 5' },
  { short: 'T6', label: 'Thứ 6' },
  { short: 'T7', label: 'Thứ 7' },
  { short: 'CN', label: 'Chủ nhật' },
];

interface PersonalSchedule {
  published: boolean;
  dutyCount: number;
  restCount: number;
  departmentName?: string;
  days: Array<{ date: string; workType: string; nightDutyHours?: string | null }>;
}

export default function TrangLichLamViecDuocSi() {
  const [weekStart, setWeekStart] = useState(() => getCurrentMonday());
  const [data, setData] = useState<PersonalSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    pharmacistSchedulesApi.getMine(weekStart)
      .then((response) => setData(response.data as PersonalSchedule))
      .catch((requestError) => setError(requestError?.response?.data?.message || 'Không thể tải lịch làm việc'))
      .finally(() => setIsLoading(false));
  }, [weekStart]);

  if (isLoading && !data) {
    return <div className="p-5 text-center">Đang tải lịch làm việc...</div>;
  }

  const isPublished = data?.published;
  const dutyDays = data?.days
    ?.map((day, index) => (day.workType === 'HANH_CHINH_VA_TRUC_DEM' || Boolean(day.nightDutyHours) ? index : -1))
    .filter((index) => index !== -1) || [];
  const restDays = data?.days
    ?.map((day, index) => (day.workType === 'NGHI_BU' ? index : -1))
    .filter((index) => index !== -1) || [];

  return (
    <div className="medicine-inventory admin-crud-page">
      <header className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Lịch cá nhân</p>
          <h1>LỊCH LÀM VIỆC</h1>
          <p className="admin-management-description">
            Theo dõi lịch làm việc hành chính, lịch trực đêm và ngày nghỉ bù được phân công bởi Trưởng khoa.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className={`doctor-status ${isPublished ? 'doctor-status--ready' : 'doctor-status--waiting'}`}>
            {isPublished ? 'Đã công bố' : 'Chưa công bố'}
          </span>
        </div>
      </header>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <div>
              <div className="doctor-stat__value">07:00</div>
              <div className="doctor-stat__label">Bắt đầu giờ hành chính</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">bedtime</span>
            </div>
            <div>
              <div className="doctor-stat__value">{data?.dutyCount || 0}</div>
              <div className="doctor-stat__label">Ca trực đêm trong tuần</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">hotel</span>
            </div>
            <div>
              <div className="doctor-stat__value">{data?.restCount || 0}</div>
              <div className="doctor-stat__label">Ngày nghỉ bù tự động</div>
            </div>
          </div>
        </div>
      </div>

      <div className="doctor-note mb-3">
        Lịch hành chính cố định <strong>07:00–16:30</strong>. Ca trực đêm từ <strong>16:30–07:00 hôm sau</strong>;
        ngày kết thúc ca trực được hệ thống tự động chuyển thành nghỉ bù cả ngày.
      </div>

      <div className="d-flex justify-content-end gap-2 mb-3">
        <button
          className="btn btn-outline-secondary px-3"
          type="button"
          onClick={() => setWeekStart(addScheduleDays(weekStart, -7))}
        >
          Tuần trước
        </button>
        <button
          className="btn btn-outline-primary px-3"
          type="button"
          disabled={weekStart === getCurrentMonday()}
          onClick={() => setWeekStart(getCurrentMonday())}
        >
          Tuần này
        </button>
        <button
          className="btn btn-primary px-3"
          type="button"
          onClick={() => setWeekStart(addScheduleDays(weekStart, 7))}
        >
          Tuần sau
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <section className="doctor-panel overflow-hidden">
          <div className="p-3 border-bottom d-flex justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Tuần bắt đầu từ {dinhDangNgay(weekStart)}</strong>
              <div className="text-secondary small mt-1">
                {data?.departmentName || 'Khoa Dược'}
              </div>
            </div>
            <div className="d-flex gap-3 small align-items-center">
              <span>
                <i className="schedule-legend schedule-legend--work" /> Hành chính
              </span>
              <span>
                <i className="schedule-legend schedule-legend--duty" /> Trực đêm
              </span>
              <span>
                <i className="schedule-legend schedule-legend--rest" /> Nghỉ bù
              </span>
            </div>
          </div>
          <div className="doctor-schedule-grid">
            {DAYS.map((day, dayIndex) => {
              const isDuty = dutyDays.includes(dayIndex);
              const isRest = restDays.includes(dayIndex);
              return (
                <article
                  className={`doctor-schedule-day ${isRest ? 'doctor-schedule-day--rest' : ''}`}
                  key={day.short}
                >
                  <div className="d-flex justify-content-between">
                    <strong>{day.label}</strong>
                    <span className="text-secondary small">
                      {dinhDangNgay(addScheduleDays(weekStart, dayIndex))}
                    </span>
                  </div>
                  {isRest ? (
                    <div className="doctor-schedule-shift schedule-shift--rest">
                      <strong>Nghỉ bù cả ngày</strong>
                      <small>
                        Sau ca trực đêm {DAYS[(dayIndex + 6) % 7].label}
                      </small>
                    </div>
                  ) : (
                    <div className="doctor-schedule-shift schedule-shift--work">
                      <strong>Ca hành chính</strong>
                      <small>07:00–16:30</small>
                    </div>
                  )}
                  {isDuty && (
                    <div className="doctor-schedule-shift schedule-shift--duty">
                      <strong>Trực đêm</strong>
                      <small>16:30–07:00 hôm sau</small>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
