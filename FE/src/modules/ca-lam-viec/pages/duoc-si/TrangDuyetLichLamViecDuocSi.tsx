import { useCallback, useEffect, useMemo, useState } from 'react';
import EmergencyReasonModal from '../../components/EmergencyReasonModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import { pharmacistSchedulesApi } from '../../api/pharmacist-schedules.api';
import { addScheduleDays, getCurrentMonday } from '../../utils/schedule-date';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/modules/bac-si/doctor-workspace.css';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface PharmacistScheduleRow {
  id: number;
  name: string;
  code: string;
  dutyDays: number[];
}

interface DepartmentSchedule {
  unit: { name: string };
  published: boolean;
  pharmacists: Array<{
    staff: { id: number; fullName: string; code: string };
    days: Array<{ nightDutyHours?: string | null }>;
  }>;
}

function hasAdjacentDuty(days: number[]) {
  return days.some((day) => days.includes((day + 1) % DAYS.length));
}

export default function TrangDuyetLichLamViecDuocSi() {
  const { showToast } = useAppToast();
  const [weekStart, setWeekStart] = useState(getCurrentMonday);
  const [data, setData] = useState<DepartmentSchedule | null>(null);
  const [rows, setRows] = useState<PharmacistScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await pharmacistSchedulesApi.getDepartment(weekStart);
      const schedule = response.data as DepartmentSchedule;
      setData(schedule);
      setRows(schedule.pharmacists.map((item) => ({
        id: item.staff.id,
        name: item.staff.fullName,
        code: item.staff.code,
        dutyDays: item.days
          .map((day, index) => (day.nightDutyHours ? index : -1))
          .filter((index) => index >= 0),
      })));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải lịch Dược', 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, weekStart]);

  useEffect(() => { void loadSchedule(); }, [loadSchedule]);

  const coverage = useMemo(
    () => DAYS.map((_, index) => rows.filter((row) => row.dutyDays.includes(index)).length),
    [rows],
  );

  const toggleDuty = (staffId: number, dayIndex: number) => {
    setRows((current) => current.map((row) => {
      if (row.id !== staffId) return row;
      const next = row.dutyDays.includes(dayIndex)
        ? row.dutyDays.filter((day) => day !== dayIndex)
        : [...row.dutyDays, dayIndex].sort((left, right) => left - right);
      if (!data?.published && next.length > 2) {
        showToast('Chỉ được xếp tối đa 2 ca trực (trừ trường hợp đổi ca khẩn cấp)', 'warning');
        return row;
      }
      if (hasAdjacentDuty(next)) {
        showToast('Không được xếp trực hai đêm liên tiếp', 'warning');
        return row;
      }
      return { ...row, dutyDays: next };
    }));
  };

  const handleSaveWithReason = async (lyDoThayDoi?: string) => {
    if (!data?.published && rows.some((row) => row.dutyDays.length !== 2 || hasAdjacentDuty(row.dutyDays))) {
      showToast('Mỗi dược sĩ cần đúng 2 ca trực và không trực hai đêm liên tiếp', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      await pharmacistSchedulesApi.saveDraft({
        weekStart,
        lyDoThayDoi,
        assignments: rows.map((row) => ({
          staffId: row.id,
          dutyDates: row.dutyDays.map((day) => addScheduleDays(weekStart, day)),
        })),
      });
      await pharmacistSchedulesApi.publish(weekStart, lyDoThayDoi);
      await loadSchedule();
      showToast('Đã lưu và công bố lịch trực Dược', 'success');
      setIsEmergencyModalOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể lưu lịch Dược', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const save = () => {
    if (data?.published) {
      setIsEmergencyModalOpen(true);
      return;
    }
    void handleSaveWithReason();
  };

  return (
    <div className="doctor-page">
      <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
        <div>
          <div className="doctor-page__eyebrow">Dành cho trưởng bộ phận Dược</div>
          <h1 className="doctor-page__title">Phân lịch trực đêm</h1>
          <p className="doctor-page__description">Có thể cập nhật tuần hiện tại khi phát sinh thay người và lập trước lịch các tuần tiếp theo.</p>
        </div>
        <button className="btn btn-primary align-self-start" disabled={isSaving || rows.length === 0} onClick={save}>
          {isSaving ? 'Đang lưu...' : data?.published ? 'Cập nhật lịch đã công bố' : 'Lưu và công bố'}
        </button>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <strong>{data?.unit.name ?? 'Bộ phận Dược'} · Tuần {dinhDangNgay(weekStart)}</strong>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary px-3" onClick={() => setWeekStart(addScheduleDays(weekStart, -7))}>Tuần trước</button>
          <button className="btn btn-outline-primary px-3" disabled={weekStart === getCurrentMonday()} onClick={() => setWeekStart(getCurrentMonday())}>Tuần này</button>
          <button className="btn btn-outline-primary px-3" onClick={() => setWeekStart(addScheduleDays(weekStart, 7))}>Tuần sau</button>
        </div>
      </div>

      <section className="doctor-panel overflow-hidden">
        {isLoading ? <div className="p-5 text-center">Đang tải lịch Dược...</div> : (
          <div className="table-responsive">
            <table className="table doctor-table align-middle mb-0">
              <thead><tr><th>Dược sĩ</th><th>Chọn ngày trực đêm</th><th>Số ca</th><th>Nghỉ bù</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.name}</strong><div className="small text-secondary">Mã: {row.code}</div></td>
                  <td>{DAYS.map((day, index) => {
                    const selected = row.dutyDays.includes(index);
                    const conflict = !selected && row.dutyDays.some((current) => Math.abs(current - index) === 1);
                    return <button key={day} type="button" disabled={conflict} className={`btn btn-sm me-2 ${selected ? 'btn-primary' : 'btn-light border'}`} onClick={() => toggleDuty(row.id, index)}>{day}</button>;
                  })}</td>
                  <td>{row.dutyDays.length}/2</td>
                  <td>{row.dutyDays.map((day) => day === 6 ? 'T2 tuần sau' : DAYS[day + 1]).join(', ') || 'Chưa có'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="p-3 border-top d-flex flex-wrap gap-2">
          {DAYS.map((day, index) => <span className={`badge ${coverage[index] >= (index >= 4 ? 2 : 1) ? 'text-bg-success' : 'text-bg-danger'}`} key={day}>{day}: {coverage[index]} dược sĩ</span>)}
        </div>
      </section>

      <EmergencyReasonModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onSubmit={(reason) => {
          void handleSaveWithReason(reason);
        }}
      />
    </div>
  );
}
