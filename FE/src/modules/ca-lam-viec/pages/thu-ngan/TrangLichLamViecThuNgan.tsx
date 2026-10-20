import { useEffect, useState } from 'react';
import { axiosClient } from '@/services/axios-client';
import { addScheduleDays, getCurrentMonday } from '../../utils/schedule-date';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/modules/bac-si/doctor-workspace.css';

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

interface ReceptionistPersonalSchedule {
  published: boolean;
  dutyCount: number;
  restCount: number;
  days: Array<{
    date: string;
    workType: 'HANH_CHINH' | 'HANH_CHINH_VA_TRUC_DEM' | 'NGHI_BU';
    isCompensatoryRest: boolean;
  }>;
}

export default function TrangLichLamViecThuNgan() {
  const [weekStart, setWeekStart] = useState(getCurrentMonday);
  const [data, setData] = useState<ReceptionistPersonalSchedule | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    axiosClient.get('/receptionist-schedules/me', { params: { weekStart } })
      .then((response) => setData(response.data.data as ReceptionistPersonalSchedule))
      .catch((requestError) => setError(requestError?.response?.data?.message || 'Không thể tải lịch làm việc'));
  }, [weekStart]);

  return (
    <div className="doctor-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="doctor-page__eyebrow">Lịch cá nhân</div>
          <h1 className="doctor-page__title">Lịch làm việc</h1>
          <p className="doctor-page__description">Xem lịch hành chính, ca trực đêm và ngày nghỉ bù của Lễ tân / Thu ngân.</p>
        </div>
        <span className={`doctor-status ${data?.published ? 'doctor-status--ready' : 'doctor-status--waiting'}`}>
          {data?.published ? 'Đã công bố' : 'Chưa công bố'}
        </span>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4"><div className="doctor-stat"><div className="doctor-stat__value">07:00</div><div className="doctor-stat__label">Bắt đầu giờ hành chính</div></div></div>
        <div className="col-md-4"><div className="doctor-stat"><div className="doctor-stat__value">{data?.dutyCount ?? 0}</div><div className="doctor-stat__label">Ca trực đêm trong tuần</div></div></div>
        <div className="col-md-4"><div className="doctor-stat"><div className="doctor-stat__value">{data?.restCount ?? 0}</div><div className="doctor-stat__label">Ngày nghỉ bù tự động</div></div></div>
      </div>

      <div className="doctor-note mb-3">Lịch hành chính cố định <strong>07:00–16:30</strong>. Ca trực đêm từ <strong>16:30–07:00 hôm sau</strong>; ngày sau trực được nghỉ bù cả ngày.</div>
      <div className="d-flex justify-content-end gap-2 mb-3">
        <button className="btn btn-outline-secondary px-3" type="button" onClick={() => setWeekStart(addScheduleDays(weekStart, -7))}>Tuần trước</button>
        <button className="btn btn-outline-primary px-3" type="button" disabled={weekStart === getCurrentMonday()} onClick={() => setWeekStart(getCurrentMonday())}>Tuần này</button>
        <button className="btn btn-outline-primary px-3" type="button" onClick={() => setWeekStart(addScheduleDays(weekStart, 7))}>Tuần sau</button>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : !data ? <div className="p-5 text-center">Đang tải lịch làm việc...</div> : (
        <section className="doctor-panel overflow-hidden">
          <div className="p-3 border-bottom d-flex justify-content-between gap-3 flex-wrap">
            <div><strong>Tuần bắt đầu từ {dinhDangNgay(weekStart)}</strong><div className="small text-secondary mt-1">Bộ phận Lễ tân / Thu ngân</div></div>
            <div className="d-flex gap-3 small align-items-center"><span><i className="schedule-legend schedule-legend--work" /> Hành chính</span><span><i className="schedule-legend schedule-legend--duty" /> Trực đêm</span><span><i className="schedule-legend schedule-legend--rest" /> Nghỉ bù</span></div>
          </div>
          <div className="doctor-schedule-grid">{data.days.map((day, index) => (
            <article className={`doctor-schedule-day ${day.isCompensatoryRest ? 'doctor-schedule-day--rest' : ''}`} key={day.date}>
              <div className="d-flex justify-content-between gap-2"><strong>{DAY_NAMES[index]}</strong><small className="text-secondary">{dinhDangNgay(day.date)}</small></div>
              {day.isCompensatoryRest ? (
                <div className="doctor-schedule-shift schedule-shift--rest"><strong>Nghỉ bù cả ngày</strong><small>Sau ca trực đêm hôm trước</small></div>
              ) : (
                <div className="doctor-schedule-shift schedule-shift--work"><strong>Ca hành chính</strong><small>07:00–16:30</small></div>
              )}
              {day.workType === 'HANH_CHINH_VA_TRUC_DEM' && <div className="doctor-schedule-shift schedule-shift--duty"><strong>Trực đêm</strong><small>16:30–07:00 hôm sau</small></div>}
            </article>
          ))}</div>
        </section>
      )}
    </div>
  );
}
