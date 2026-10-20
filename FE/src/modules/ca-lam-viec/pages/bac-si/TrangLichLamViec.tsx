import { useEffect, useState } from 'react';
import { useWorkSchedules } from '../../hooks/use-work-schedules';
import { addScheduleDays, getCurrentMonday } from '../../utils/schedule-date';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/modules/bac-si/doctor-workspace.css';

const DAYS = [
  { short: 'T2', label: 'Thứ 2', date: '03/08' },
  { short: 'T3', label: 'Thứ 3', date: '04/08' },
  { short: 'T4', label: 'Thứ 4', date: '05/08' },
  { short: 'T5', label: 'Thứ 5', date: '06/08' },
  { short: 'T6', label: 'Thứ 6', date: '07/08' },
  { short: 'T7', label: 'Thứ 7', date: '08/08' },
  { short: 'CN', label: 'Chủ nhật', date: '09/08' },
];

export default function TrangLichLamViec() {
  const [weekStart, setWeekStart] = useState(() => getCurrentMonday());
  const { mySchedule, isLoading, fetchMySchedule } = useWorkSchedules();

  useEffect(() => {
    fetchMySchedule(weekStart);
  }, [fetchMySchedule, weekStart]);

  if (isLoading && !mySchedule) {
    return <div className="p-5 text-center">Đang tải lịch làm việc...</div>;
  }

  const isPublished = mySchedule?.published;
  const dutyDays = mySchedule?.days
    .map((day: any, index: number) => (day.workType === 'HANH_CHINH_VA_TRUC_DEM' ? index : -1))
    .filter((index: number) => index !== -1) || [];
  const restDays = mySchedule?.days
    .map((day: any, index: number) => (day.workType === 'NGHI_BU' ? index : -1))
    .filter((index: number) => index !== -1) || [];

  return (
    <div className="doctor-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="doctor-page__eyebrow">Lịch cá nhân</div>
          <h1 className="doctor-page__title">Lịch làm việc</h1>
          <p className="doctor-page__description">
            Xem lịch hành chính, ca trực đêm và ngày nghỉ bù do trưởng khoa phân công.
          </p>
        </div>
        <span className={`doctor-status ${isPublished ? 'doctor-status--ready' : 'doctor-status--waiting'}`}>
          {isPublished ? 'Đã công bố' : 'Chưa công bố'}
        </span>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4"><div className="doctor-stat"><div className="doctor-stat__icon"><span className="material-symbols-outlined">schedule</span></div><div><div className="doctor-stat__value">07:00</div><div className="doctor-stat__label">Bắt đầu giờ hành chính</div></div></div></div>
        <div className="col-md-4"><div className="doctor-stat"><div className="doctor-stat__icon"><span className="material-symbols-outlined">bedtime</span></div><div><div className="doctor-stat__value">{mySchedule?.dutyCount || 0}</div><div className="doctor-stat__label">Ca trực đêm trong tuần</div></div></div></div>
        <div className="col-md-4"><div className="doctor-stat"><div className="doctor-stat__icon"><span className="material-symbols-outlined">hotel</span></div><div><div className="doctor-stat__value">{mySchedule?.restCount || 0}</div><div className="doctor-stat__label">Ngày nghỉ bù tự động</div></div></div></div>
      </div>

      <div className="doctor-note mb-3">
        Lịch hành chính cố định <strong>07:00–16:30</strong>. Ca trực đêm từ <strong>16:30–07:00 hôm sau</strong>;
        ngày kết thúc ca trực được hệ thống tự động chuyển thành nghỉ bù cả ngày.
      </div>

      <div className="d-flex justify-content-end gap-2 mb-3">
        <button className="btn btn-outline-secondary px-3" type="button" onClick={() => setWeekStart(addScheduleDays(weekStart, -7))}>Tuần trước</button>
        <button className="btn btn-outline-primary px-3" type="button" disabled={weekStart === getCurrentMonday()} onClick={() => setWeekStart(getCurrentMonday())}>Tuần này</button>
        <button className="btn btn-outline-primary px-3" type="button" onClick={() => setWeekStart(addScheduleDays(weekStart, 7))}>Tuần sau</button>
      </div>

      <section className="doctor-panel overflow-hidden">
        <div className="p-3 border-bottom d-flex justify-content-between gap-3 flex-wrap">
          <div>
          <strong>Tuần bắt đầu từ {dinhDangNgay(weekStart)}</strong>
            <div className="text-secondary small mt-1">{mySchedule?.specialty?.name || 'Khoa Nội tổng quát'}</div>
          </div>
          <div className="d-flex gap-3 small align-items-center"><span><i className="schedule-legend schedule-legend--work" /> Hành chính</span><span><i className="schedule-legend schedule-legend--duty" /> Trực đêm</span><span><i className="schedule-legend schedule-legend--rest" /> Nghỉ bù</span></div>
        </div>
        <div className="doctor-schedule-grid">
          {DAYS.map((day, dayIndex) => {
            const isDuty = dutyDays.includes(dayIndex);
            const isRest = restDays.includes(dayIndex);
            return (
              <article className={`doctor-schedule-day ${isRest ? 'doctor-schedule-day--rest' : ''}`} key={day.short}>
                      <div className="d-flex justify-content-between"><strong>{day.label}</strong><span className="text-secondary small">{dinhDangNgay(addScheduleDays(weekStart, dayIndex))}</span></div>
                {isRest ? (
                  <div className="doctor-schedule-shift schedule-shift--rest"><strong>Nghỉ bù cả ngày</strong><small>Sau ca trực đêm {DAYS[(dayIndex + 6) % 7].label}</small></div>
                ) : (
                  <div className="doctor-schedule-shift schedule-shift--work"><strong>Ca hành chính</strong><small>07:00–16:30</small></div>
                )}
                {isDuty && <div className="doctor-schedule-shift schedule-shift--duty"><strong>Trực đêm</strong><small>16:30–07:00 hôm sau</small></div>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
