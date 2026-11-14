import { useCallback, useEffect, useMemo, useState } from 'react';
import EmergencyReasonModal from '../../components/EmergencyReasonModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import { pharmacistSchedulesApi } from '../../api/pharmacist-schedules.api';
import { addScheduleDays, getCurrentMonday } from '../../utils/schedule-date';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '@/modules/bac-si/doctor-workspace.css';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MIN_NIGHT_STAFF = [1, 1, 1, 1, 2, 2, 2];
const MIN_PHARMACISTS_FOR_AUTO = 7;
const BALANCED_DUTY_PATTERNS = [
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [5, 0],
  [6, 1],
];

interface PharmacistScheduleRow {
  id: number;
  name: string;
  code: string;
  dutyDays: number[];
  blockedDutyDays: number[];
}

interface DepartmentSchedule {
  unit: { name: string };
  published: boolean;
  pharmacists: Array<{
    staff: { id: number; fullName: string; code: string };
    blockedDutyDays?: number[];
    days: Array<{ nightDutyHours?: string | null }>;
  }>;
}

function hasAdjacentDuty(days: number[]) {
  return days.some((day) => days.includes((day + 1) % DAYS.length));
}

function restDayLabels(dutyDays: number[]) {
  return dutyDays.map((day) =>
    day === DAYS.length - 1 ? 'T2 tuần sau' : DAYS[day + 1],
  );
}

export default function TrangDuyetLichLamViecDuocSi() {
  const { showToast } = useAppToast();
  const [weekStart, setWeekStart] = useState(() => getCurrentMonday());
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
        blockedDutyDays: item.blockedDutyDays ?? [],
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

  const dayCoverage = useMemo(
    () => DAYS.map((_, dayIndex) => (
      dayIndex === 0 ? rows.length : Math.max(0, rows.length - coverage[dayIndex - 1])
    )),
    [coverage, rows.length],
  );

  const validPharmacists = rows.filter(
    (row) => row.dutyDays.length === 2 && !hasAdjacentDuty(row.dutyDays),
  ).length;
  const hasAssignedDuties = rows.some((row) => row.dutyDays.length > 0);

  const toggleDuty = (staffId: number, dayIndex: number) => {
    setRows((current) => current.map((row) => {
      if (row.id !== staffId) return row;
      const next = row.dutyDays.includes(dayIndex)
        ? row.dutyDays.filter((day) => day !== dayIndex)
        : [...row.dutyDays, dayIndex].sort((left, right) => left - right);
      if (!row.dutyDays.includes(dayIndex) && row.blockedDutyDays.includes(dayIndex)) {
        showToast('Không thể xếp ca này vì dược sĩ đã trực ở tuần liền kề', 'warning');
        return row;
      }
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
    if (!data?.published && validPharmacists !== rows.length) {
      showToast('Vui lòng phân đủ 2 ca trực hợp lệ cho tất cả dược sĩ', 'warning');
      return;
    }
    if (coverage.some((count, idx) => count < MIN_NIGHT_STAFF[idx])) {
      showToast('Số lượng trực đêm chưa đủ: T2–T5 tối thiểu 1, T6–CN tối thiểu 2 dược sĩ', 'warning');
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
      showToast('Đã lưu và công bố lịch trực Dược thành công!', 'success');
      setIsEmergencyModalOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể lưu lịch Dược', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (data?.published) {
      setIsEmergencyModalOpen(true);
      return;
    }
    void handleSaveWithReason();
  };

  const handleAutoSchedule = () => {
    if (rows.length < MIN_PHARMACISTS_FOR_AUTO) {
      showToast('Khoa chưa đủ 7 dược sĩ để tự động xếp lịch cân đối', 'warning');
      return;
    }

    const newRows = rows.map((row, index) => {
      const patterns = [
        ...BALANCED_DUTY_PATTERNS.slice(index % BALANCED_DUTY_PATTERNS.length),
        ...BALANCED_DUTY_PATTERNS.slice(0, index % BALANCED_DUTY_PATTERNS.length),
      ];
      const pattern = patterns.find((days) =>
        days.every((day) => !row.blockedDutyDays.includes(day)),
      );
      return { ...row, dutyDays: pattern ? [...pattern] : [] };
    });

    if (newRows.some((row) => row.dutyDays.length !== 2)) {
      showToast('Không thể tự xếp do có dược sĩ bị khóa ca ở tuần liền kề', 'warning');
      return;
    }

    setRows(newRows);
    showToast('Đã tự động xếp lịch trực hợp lệ cho tất cả dược sĩ', 'success');
  };

  return (
    <div className="medicine-inventory admin-crud-page">
      <header className="admin-crud-heading align-items-end">
        <div>
          <p className="admin-management-eyebrow">Điều phối lịch làm việc</p>
          <h1>PHÂN LỊCH TRỰC ĐÊM</h1>
          <p className="admin-management-description">
            Thiết lập và điều phối lịch trực đêm, quản lý định mức phân công và chế độ nghỉ bù của đội ngũ Dược sĩ.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            className="btn btn-outline-primary bg-white d-inline-flex align-items-center gap-1"
            disabled={isSaving || rows.length === 0}
            onClick={handleAutoSchedule}
          >
            <span className="material-symbols-outlined fs-5">magic_button</span>
            <span>Tự động xếp lịch</span>
          </button>
          <button
            className="btn btn-primary d-inline-flex align-items-center gap-1 text-white"
            disabled={isSaving || rows.length === 0}
            onClick={handleSave}
          >
            <span>{isSaving ? 'Đang lưu...' : (data?.published ? 'Cập nhật lại lịch đã công bố' : 'Lưu và công bố lịch')}</span>
          </button>
        </div>
      </header>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="doctor-stat">
            <div>
              <div className="doctor-stat__value">{rows.length}</div>
              <div className="doctor-stat__label">Dược sĩ trong khoa</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="doctor-stat">
            <div>
              <div className="doctor-stat__value">
                {rows.reduce((total, row) => total + row.dutyDays.length, 0)}
              </div>
              <div className="doctor-stat__label">Lượt trực đã phân</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="doctor-stat">
            <div>
              <div className="doctor-stat__value">
                {validPharmacists}/{rows.length}
              </div>
              <div className="doctor-stat__label">Dược sĩ đủ hai ca</div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="alert d-flex align-items-start gap-3 mb-4 shadow-sm border"
        style={{ backgroundColor: '#f8fafd', borderColor: '#e2e8f0' }}
      >
        <span className="material-symbols-outlined text-primary fs-4 mt-1">info</span>
        <div className="flex-grow-1">
          <h6 className="fw-bold mb-2 text-primary">Hướng dẫn phân lịch trực đêm</h6>
          <ul className="mb-0 ps-3 small text-secondary" style={{ lineHeight: '1.6' }}>
            <li>Mỗi dược sĩ được phân <strong>2 ca trực đêm/tuần</strong> (16:30–07:00 hôm sau).</li>
            <li><strong>Không được xếp hai đêm liên tiếp.</strong> Hệ thống tự động gạch chéo khóa lại các đêm liền kề để tránh vi phạm.</li>
            <li>Sau khi trực đêm, ngày hôm sau sẽ tự động được đánh dấu là <span className="badge bg-light text-dark border">nghỉ bù</span> và không xếp lịch hành chính (07:00–16:30).</li>
            <li>Đảm bảo quân số trực đêm: <strong>Thứ 2–Thứ 5 cần tối thiểu 1</strong> và <strong>Thứ 6–Chủ nhật cần tối thiểu 2 dược sĩ</strong> trực đêm.</li>
          </ul>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <strong>Tuần đang xem: {dinhDangNgay(weekStart)}</strong>
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
            className="btn btn-primary px-3"
            type="button"
            onClick={() => setWeekStart(addScheduleDays(weekStart, 7))}
          >
            Tuần sau
          </button>
        </div>
      </div>

      <section className="doctor-panel overflow-hidden mb-4">
        <div className="p-3 border-bottom d-flex justify-content-between flex-wrap gap-2">
          <div>
            <strong>Tuần bắt đầu từ {dinhDangNgay(weekStart)}</strong>
            <div className="small text-secondary mt-1">{data?.unit?.name || 'Khoa Dược'}</div>
          </div>
          <span className="text-secondary">Ca trực: 16:30–07:00 hôm sau</span>
        </div>

        {data?.published && (
          <div className="alert alert-warning m-3 py-2">
            Lịch tuần này đã được công bố. Bất kỳ thay đổi nào và lưu lại sẽ ghi đè lịch cũ và gửi lại thông báo mới.
          </div>
        )}

        {!isLoading && data && !hasAssignedDuties && (
          <div className="alert alert-info m-3 py-2">
            Tuần này chưa có lịch trực. Trưởng bộ phận Dược có thể chọn ca trực cho nhân sự bên dưới.
          </div>
        )}

        {isLoading ? (
          <div className="p-5 text-center">Đang tải lịch Dược...</div>
        ) : (
          <div className="table-responsive">
            <table
              className="table doctor-table align-middle mb-0"
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '36%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Dược sĩ</th>
                  <th style={{ width: '16%' }}>Lịch hành chính</th>
                  <th style={{ width: '36%' }}>Chọn ngày trực đêm</th>
                  <th style={{ width: '14%' }}>Nghỉ bù tự động</th>
                  <th style={{ width: '12%' }}>Kiểm tra</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isValid = row.dutyDays.length === 2 && !hasAdjacentDuty(row.dutyDays);
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong className="d-block text-truncate" title={row.name}>
                          {row.name}
                        </strong>
                        <div className="small text-secondary text-truncate">
                          Mã dược sĩ: {row.code}
                        </div>
                      </td>
                      <td>
                        <strong>07:00–16:30</strong>
                        <div className="small text-secondary">Trừ ngày nghỉ bù</div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          {DAYS.map((day, index) => {
                            const isSelected = row.dutyDays.includes(index);
                            const isBoundaryBlocked = !isSelected && row.blockedDutyDays.includes(index);
                            const conflicts = !isSelected && (
                              isBoundaryBlocked || row.dutyDays.some((selectedDay) =>
                                Math.abs(selectedDay - index) === 1 || Math.abs(selectedDay - index) === DAYS.length - 1,
                              )
                            );

                            let btnClass = 'btn-light border text-secondary shadow-sm';
                            if (isSelected) btnClass = 'btn-primary shadow-sm';

                            return (
                              <div key={day} style={{ display: 'inline-block', position: 'relative' }}>
                                <button
                                  type="button"
                                  disabled={conflicts}
                                  title={
                                    isBoundaryBlocked
                                      ? 'Dược sĩ đã trực ở tuần liền kề'
                                      : conflicts
                                      ? 'Không thể trực hai đêm liên tiếp'
                                      : 'Chọn làm ca trực đêm'
                                  }
                                  className={`btn btn-sm ${btnClass}`}
                                  style={
                                    conflicts
                                      ? { width: '48px', fontWeight: '500', pointerEvents: 'none', background: '#f8f9fa', color: '#ccc', textDecoration: 'line-through' }
                                      : { width: '48px', fontWeight: '500' }
                                  }
                                  onClick={() => toggleDuty(row.id, index)}
                                >
                                  {day}
                                </button>
                                {conflicts && (
                                  <span
                                    title={
                                      isBoundaryBlocked
                                        ? 'Dược sĩ đã trực ở tuần liền kề'
                                        : 'Không thể trực hai đêm liên tiếp'
                                    }
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'not-allowed' }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <small className={isValid ? 'text-success' : 'text-danger'}>
                          {row.dutyDays.length}/2 ca trực
                        </small>
                      </td>
                      <td>{restDayLabels(row.dutyDays).join(', ') || 'Chưa có'}</td>
                      <td>
                        <span className={`doctor-status ${isValid ? 'doctor-status--ready' : 'doctor-status--waiting'}`}>
                          {isValid ? 'Hợp lệ' : 'Chưa đủ ca'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      Không có dược sĩ nào trong danh sách
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="doctor-panel overflow-hidden">
        <div className="p-3 border-bottom">
          <strong>Nhân sự theo ngày</strong>
          <div className="small text-secondary mt-1">
            Kiểm tra đồng thời ca ngày và ca trực đêm trước khi công bố.
          </div>
        </div>
        <div className="row g-0">
          {DAYS.map((day, index) => {
            const isEnough = coverage[index] >= MIN_NIGHT_STAFF[index] && dayCoverage[index] >= 1;
            return (
              <div className="col border-end p-3 text-center" key={day}>
                <strong className="d-block">{day}</strong>
                <span className={`doctor-status mt-2 ${isEnough ? 'doctor-status--ready' : 'doctor-status--cancelled'}`}>
                  Ca ngày {dayCoverage[index]} · Trực đêm {coverage[index]}
                </span>
              </div>
            );
          })}
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
