import { useEffect, useState } from 'react';
import { pharmacistSchedulesApi } from '../../api/pharmacist-schedules.api';
import { addScheduleDays, getCurrentMonday } from '../../utils/schedule-date';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/modules/bac-si/doctor-workspace.css';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

interface PersonalSchedule {
  published: boolean;
  dutyCount: number;
  restCount: number;
  days: Array<{ date: string; workType: string; nightDutyHours?: string | null }>;
}

export default function TrangLichLamViecDuocSi() {
  const [weekStart, setWeekStart] = useState(getCurrentMonday);
  const [data, setData] = useState<PersonalSchedule | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    pharmacistSchedulesApi.getMine(weekStart)
      .then((response) => setData(response.data as PersonalSchedule))
      .catch((requestError) => setError(requestError?.response?.data?.message || 'Không thể tải lịch làm việc'));
  }, [weekStart]);

  return (
    <div className="doctor-page">
      <div className="doctor-page__eyebrow">Lịch cá nhân</div>
      <h1 className="doctor-page__title">Lịch làm việc</h1>
      <p className="doctor-page__description">Lịch hành chính, trực đêm và nghỉ bù do trưởng bộ phận Dược công bố.</p>

      <div className="d-flex justify-content-end gap-2 mb-3">
        <button className="btn btn-outline-secondary px-3" onClick={() => setWeekStart(addScheduleDays(weekStart, -7))}>Tuần trước</button>
        <button className="btn btn-outline-primary px-3" disabled={weekStart === getCurrentMonday()} onClick={() => setWeekStart(getCurrentMonday())}>Tuần này</button>
        <button className="btn btn-outline-primary px-3" onClick={() => setWeekStart(addScheduleDays(weekStart, 7))}>Tuần sau</button>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : !data ? <div className="p-5 text-center">Đang tải lịch làm việc...</div> : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-4"><div className="doctor-stat"><div className="doctor-stat__value">07:00</div><div className="doctor-stat__label">Ca hành chính</div></div></div>
            <div className="col-md-4"><div className="doctor-stat"><div className="doctor-stat__value">{data.dutyCount}</div><div className="doctor-stat__label">Ca trực đêm trong tuần</div></div></div>
            <div className="col-md-4"><div className="doctor-stat"><div className="doctor-stat__value">{data.restCount}</div><div className="doctor-stat__label">Ngày nghỉ bù</div></div></div>
          </div>
          <section className="doctor-panel">
            <div className="p-3 border-bottom d-flex justify-content-between"><strong>Tuần {dinhDangNgay(weekStart)}</strong><span>{data.published ? 'Đã công bố' : 'Chưa công bố'}</span></div>
            <div className="doctor-schedule-grid">{data.days.map((day, index) => (
              <article className={`doctor-schedule-day ${day.workType === 'NGHI_BU' ? 'doctor-schedule-day--rest' : ''}`} key={day.date}>
                <div className="d-flex justify-content-between gap-2">
                  <strong>{DAYS[index]}</strong>
                  <small className="text-secondary">{dinhDangNgay(day.date)}</small>
                </div>
                {day.workType === 'NGHI_BU' ? <div className="doctor-schedule-shift schedule-shift--rest"><strong>Nghỉ bù cả ngày</strong></div> : <div className="doctor-schedule-shift schedule-shift--work"><strong>Ca hành chính</strong><small>07:00–16:30</small></div>}
                {day.nightDutyHours && <div className="doctor-schedule-shift schedule-shift--duty"><strong>Trực đêm</strong><small>16:30–07:00 hôm sau</small></div>}
              </article>
            ))}</div>
          </section>
        </>
      )}
    </div>
  );
}
