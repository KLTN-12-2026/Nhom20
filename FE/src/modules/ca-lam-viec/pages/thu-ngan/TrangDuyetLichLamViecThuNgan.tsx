import { useEffect, useMemo, useState } from 'react';

import EmergencyReasonModal from '../../components/EmergencyReasonModal';

import { useAppToast } from '@/components/ui/use-app-toast';

import { useReceptionistSchedules } from '../../hooks/use-receptionist-schedules';
import { addScheduleDays, getCurrentMonday } from '../../utils/schedule-date';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/modules/bac-si/doctor-workspace.css';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface ReceptionistDutyRow {
  id: number;
  code: string;
  name: string;
  dutyDays: number[];
}

function hasAdjacentDuty(days: number[]) {
  return days.some((day) => days.includes((day + 1) % DAYS.length));
}

export default function TrangDuyetLichLamViecThuNgan() {
  const {
    departmentSchedule,
    isLoading,
    fetchDepartmentSchedule,
    createAutoSchedule,
    saveAndPublish,
  } = useReceptionistSchedules();
  const { showToast } = useAppToast();
  const [weekStart, setWeekStart] = useState(getCurrentMonday);
  const [rows, setRows] = useState<ReceptionistDutyRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  useEffect(() => {
    void fetchDepartmentSchedule(weekStart);
  }, [fetchDepartmentSchedule, weekStart]);

  useEffect(() => {
    if (!departmentSchedule) return;
    setRows(
      departmentSchedule.receptionists.map((staff) => ({
        id: staff.staff.id,
        code: staff.staff.code,
        name: staff.staff.fullName,
        dutyDays: staff.days
          .map((day, index) =>
            day.workType === 'HANH_CHINH_VA_TRUC_DEM' ? index : -1,
          )
          .filter((index) => index >= 0),
      })),
    );
  }, [departmentSchedule]);

  const coverage = useMemo(
    () =>
      DAYS.map(
        (_, dayIndex) =>
          rows.filter((row) => row.dutyDays.includes(dayIndex)).length,
      ),
    [rows],
  );

  const toggleDuty = (staffId: number, dayIndex: number) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== staffId) return row;
        const next = row.dutyDays.includes(dayIndex)
          ? row.dutyDays.filter((day) => day !== dayIndex)
          : [...row.dutyDays, dayIndex].sort((left, right) => left - right);
        if (!departmentSchedule?.published && next.length > 2) {
          showToast('Chỉ được xếp tối đa 2 ca trực (trừ trường hợp đổi ca khẩn cấp)', 'warning');
          return row;
        }
        if (hasAdjacentDuty(next)) {
          showToast('Không được xếp trực hai đêm liên tiếp', 'warning');
          return row;
        }
        return { ...row, dutyDays: next };
      }),
    );
  };

  const autoSchedule = async () => {
    try {
      // Backend tính phương án để dùng cùng một quy tắc ở mọi thiết bị.
      const generated = await createAutoSchedule(weekStart);
      const weekStartTime = new Date(`${weekStart}T00:00:00`).getTime();
      const daysByStaff = new Map(
        generated.assignments.map((assignment) => [
          assignment.staffId,
          assignment.dutyDates.map((date) =>
            Math.round(
              (new Date(`${date}T00:00:00`).getTime() - weekStartTime) /
                86_400_000,
            ),
          ),
        ]),
      );
      setRows((current) =>
        current.map((row) => ({
          ...row,
          dutyDays: daysByStaff.get(row.id) ?? [],
        })),
      );
      showToast('Đã tạo phương án trực đêm theo quy tắc hệ thống', 'success');
    } catch {
      showToast(
        'Không thể tự động phân trực. Kiểm tra số nhân sự và lịch tuần trước.',
        'danger',
      );
    }
  };

  const handleSaveWithReason = async (lyDoThayDoi?: string) => {
    if (
      !departmentSchedule?.published &&
      rows.some(
        (row) => row.dutyDays.length !== 2 || hasAdjacentDuty(row.dutyDays),
      )
    ) {
      showToast(
        'Mỗi nhân viên cần đúng 2 ca trực đêm, không được trực hai đêm liên tiếp.',
        'warning',
      );
      return;
    }
    if (coverage.some((count) => count < 2)) {
      showToast('Mỗi đêm cần tối thiểu 2 nhân viên trực.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await saveAndPublish({
        weekStart,
        lyDoThayDoi,
        assignments: rows.map((row) => ({
          staffId: row.id,
          dutyDates: row.dutyDays.map((day) =>
            addScheduleDays(weekStart, day),
          ),
        })),
      });
      await fetchDepartmentSchedule(weekStart);
      showToast('Đã lưu và công bố lịch trực đêm Thu ngân.', 'success');
      setIsEmergencyModalOpen(false);
    } catch {
      showToast('Không thể lưu lịch trực. Vui lòng kiểm tra lại dữ liệu.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const save = () => {
    if (departmentSchedule?.published) {
      setIsEmergencyModalOpen(true);
      return;
    }
    void handleSaveWithReason();
  };



  return (
    <div className="doctor-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="doctor-page__eyebrow">Dành cho trưởng bộ phận</div>
          <h1 className="doctor-page__title">Phân lịch trực đêm Thu ngân</h1>
          <p className="doctor-page__description">
            Ca hành chính 07:00–16:30 là lịch cố định. Chỉ phân ca trực đêm;
            hệ thống tự tạo ngày nghỉ bù sau trực.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary bg-white"
            type="button"
            disabled={isSaving || rows.length === 0}
            onClick={() => void autoSchedule()}
          >
            Tự động phân trực
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={isSaving || rows.length === 0}
            onClick={() => void save()}
          >
            {isSaving
              ? 'Đang lưu...'
              : departmentSchedule?.published
                ? 'Cập nhật lịch đã công bố'
                : 'Lưu và công bố lịch'}
          </button>
        </div>
      </div>

      <div className="doctor-note mb-3">
        Nhấn từng ngày để thêm hoặc bỏ ca trực đêm. Mỗi nhân viên có đúng{' '}
        <strong>2 ca trực/tuần</strong>, không trực hai đêm liên tiếp và mỗi
        đêm có tối thiểu <strong>2 nhân viên</strong>.
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <strong>
          {departmentSchedule?.unit?.name || 'Bộ phận Lễ tân / Thu ngân'} · Tuần{' '}
          {dinhDangNgay(weekStart)}
        </strong>
        <div className="d-flex gap-2">
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
            className="btn btn-outline-primary px-3"
            type="button"
            onClick={() => setWeekStart(addScheduleDays(weekStart, 7))}
          >
            Tuần sau
          </button>
        </div>
      </div>

      <section className="doctor-panel overflow-hidden">
        {isLoading ? (
          <div className="p-5 text-center">Đang tải lịch làm việc...</div>
        ) : (
          <div className="table-responsive">
            <table className="table doctor-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Chọn ngày trực đêm</th>
                  <th>Số ca</th>
                  <th>Nghỉ bù tự động</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <div className="small text-secondary">Mã NV: {row.code}</div>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {DAYS.map((day, index) => {
                          const selected = row.dutyDays.includes(index);
                          const conflict =
                            !selected &&
                            row.dutyDays.some(
                              (current) =>
                                Math.abs(current - index) === 1 ||
                                (current === 6 && index === 0) ||
                                (current === 0 && index === 6),
                            );
                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={conflict}
                              className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-light border'}`}
                              onClick={() => toggleDuty(row.id, index)}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td>{row.dutyDays.length}/2</td>
                    <td>
                      {row.dutyDays
                        .map((day) => (day === 6 ? 'T2 tuần sau' : DAYS[day + 1]))
                        .join(', ') || 'Chưa có'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-3 border-top d-flex flex-wrap gap-2">
          {DAYS.map((day, index) => (
            <span
              className={`badge ${coverage[index] >= 2 ? 'text-bg-success' : 'text-bg-danger'}`}
              key={day}
            >
              {day}: {coverage[index]} nhân viên trực
            </span>
          ))}
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
