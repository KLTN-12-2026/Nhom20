import { useEffect, useMemo, useState } from 'react';

import EmergencyReasonModal from '../../components/EmergencyReasonModal';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';

import { useReceptionistSchedules } from '../../hooks/use-receptionist-schedules';
import { addScheduleDays, getCurrentMonday } from '../../utils/schedule-date';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '@/modules/bac-si/doctor-workspace.css';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MIN_NIGHT_STAFF = [2, 2, 2, 2, 2, 2, 2];

interface ReceptionistDutyRow {
  id: number;
  code: string;
  name: string;
  dutyDays: number[];
  blockedDutyDays: number[];
}

function hasAdjacentDuty(days: number[]) {
  return days.some((day) => days.includes((day + 1) % DAYS.length));
}

function restDayLabels(dutyDays: number[]) {
  return dutyDays.map((day) =>
    day === DAYS.length - 1 ? 'T2 tuần sau' : DAYS[day + 1],
  );
}

export default function TrangDuyetLichLamViecThuNgan() {
  const {
    departmentSchedule,
    isLoading,
    error,
    fetchDepartmentSchedule,
    createAutoSchedule,
    saveAndPublish,
  } = useReceptionistSchedules();
  const { showToast } = useAppToast();
  const [weekStart, setWeekStart] = useState(() => getCurrentMonday());
  const [rows, setRows] = useState<ReceptionistDutyRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [scheduleAction, setScheduleAction] = useState<'auto' | 'manual' | null>(
    null,
  );

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
        blockedDutyDays: (staff as { blockedDutyDays?: number[] }).blockedDutyDays ?? [],
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

  const dayCoverage = useMemo(
    () =>
      DAYS.map((_, dayIndex) =>
        dayIndex === 0
          ? rows.length
          : Math.max(0, rows.length - coverage[dayIndex - 1]),
      ),
    [coverage, rows.length],
  );

  const validStaffCount = rows.filter(
    (row) => row.dutyDays.length === 2 && !hasAdjacentDuty(row.dutyDays),
  ).length;
  const hasAssignedDuties = rows.some((row) => row.dutyDays.length > 0);

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

  const autoSchedule = async (lyDoThayDoi?: string) => {
    setIsSaving(true);
    try {
      await createAutoSchedule(weekStart, lyDoThayDoi);
      await fetchDepartmentSchedule(weekStart);
      setIsEmergencyModalOpen(false);
      setScheduleAction(null);
      showToast('Đã tự động phân và công bố lịch trực đêm Thu ngân.', 'success');
    } catch (requestError) {
      showToast(
        getApiErrorMessage(
          requestError,
          'Không thể tự động phân trực. Kiểm tra số nhân sự và lịch tuần trước.',
        ),
        'danger',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const startAutoSchedule = () => {
    if (departmentSchedule?.published) {
      setScheduleAction('auto');
      setIsEmergencyModalOpen(true);
      return;
    }
    void autoSchedule();
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
      setScheduleAction(null);
    } catch {
      showToast('Không thể lưu lịch trực. Vui lòng kiểm tra lại dữ liệu.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const save = () => {
    if (departmentSchedule?.published) {
      setScheduleAction('manual');
      setIsEmergencyModalOpen(true);
      return;
    }
    void handleSaveWithReason();
  };

  return (
    <div className="medicine-inventory admin-crud-page">
      <header className="admin-crud-heading align-items-end">
        <div>
          <p className="admin-management-eyebrow">Điều phối lịch làm việc</p>
          <h1>PHÂN LỊCH TRỰC ĐÊM THU NGÂN</h1>
          <p className="admin-management-description">
            Thiết lập và điều phối lịch trực đêm, quản lý định mức phân công và chế độ nghỉ bù của đội ngũ thu ngân / lễ tân.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            className="btn btn-outline-primary bg-white d-inline-flex align-items-center gap-1"
            disabled={isSaving || rows.length === 0}
            onClick={startAutoSchedule}
          >
            <span className="material-symbols-outlined fs-5">magic_button</span>
            <span>Tự động xếp lịch</span>
          </button>
          <button
            className="btn btn-primary d-inline-flex align-items-center gap-1 text-white"
            disabled={isSaving || rows.length === 0}
            onClick={() => void save()}
          >
            <span>
              {isSaving
                ? 'Đang lưu...'
                : departmentSchedule?.published
                ? 'Cập nhật lại lịch đã công bố'
                : 'Lưu và công bố lịch'}
            </span>
          </button>
        </div>
      </header>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="doctor-stat">
            <div>
              <div className="doctor-stat__value">{rows.length}</div>
              <div className="doctor-stat__label">Thu ngân trong bộ phận</div>
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
                {validStaffCount}/{rows.length}
              </div>
              <div className="doctor-stat__label">Nhân sự đủ hai ca</div>
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
          <h6 className="fw-bold mb-2 text-primary">Hướng dẫn phân lịch trực đêm Thu ngân</h6>
          <ul className="mb-0 ps-3 small text-secondary" style={{ lineHeight: '1.6' }}>
            <li>Mỗi thu ngân được phân <strong>2 ca trực đêm/tuần</strong> (16:30–07:00 hôm sau).</li>
            <li><strong>Không được xếp hai đêm liên tiếp.</strong> Hệ thống tự động gạch chéo khóa lại các đêm liền kề để tránh vi phạm.</li>
            <li>Sau khi trực đêm, ngày hôm sau sẽ tự động được đánh dấu là <span className="badge bg-light text-dark border">nghỉ bù</span> và không xếp lịch hành chính (07:00–16:30).</li>
            <li>Đảm bảo quân số trực đêm: <strong>Mỗi đêm cần tối thiểu 2 thu ngân</strong> trực đêm.</li>
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
            <div className="small text-secondary mt-1">
              {departmentSchedule?.unit?.name || 'Bộ phận Lễ tân / Thu ngân'}
            </div>
          </div>
          <span className="text-secondary">Ca trực: 16:30–07:00 hôm sau</span>
        </div>

        {departmentSchedule?.published && (
          <div className="alert alert-warning m-3 py-2">
            Lịch tuần này đã được công bố. Bất kỳ thay đổi nào và lưu lại sẽ ghi đè lịch cũ và gửi lại thông báo mới.
          </div>
        )}

        {!isLoading && departmentSchedule && !hasAssignedDuties && (
          <div className="alert alert-info m-3 py-2">
            Tuần này chưa có lịch trực. Trưởng bộ phận có thể chọn ca trực cho nhân sự bên dưới.
          </div>
        )}

        {error ? (
          <div className="p-5 text-center text-danger">{error}</div>
        ) : isLoading ? (
          <div className="p-5 text-center">Đang tải lịch làm việc...</div>
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
                  <th style={{ width: '22%' }}>Nhân viên</th>
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
                          Mã NV: {row.code}
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
                            const conflicts =
                              !isSelected &&
                              (isBoundaryBlocked ||
                                row.dutyDays.some(
                                  (selectedDay) =>
                                    Math.abs(selectedDay - index) === 1 ||
                                    Math.abs(selectedDay - index) === DAYS.length - 1,
                                ));

                            let btnClass = 'btn-light border text-secondary shadow-sm';
                            if (isSelected) btnClass = 'btn-primary shadow-sm';

                            return (
                              <div key={day} style={{ display: 'inline-block', position: 'relative' }}>
                                <button
                                  type="button"
                                  disabled={conflicts}
                                  title={
                                    isBoundaryBlocked
                                      ? 'Nhân viên đã trực ở tuần liền kề'
                                      : conflicts
                                      ? 'Không thể trực hai đêm liên tiếp'
                                      : 'Chọn làm ca trực đêm'
                                  }
                                  className={`btn btn-sm ${btnClass}`}
                                  style={
                                    conflicts
                                      ? {
                                          width: '48px',
                                          fontWeight: '500',
                                          pointerEvents: 'none',
                                          background: '#f8f9fa',
                                          color: '#ccc',
                                          textDecoration: 'line-through',
                                        }
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
                                        ? 'Nhân viên đã trực ở tuần liền kề'
                                        : 'Không thể trực hai đêm liên tiếp'
                                    }
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      cursor: 'not-allowed',
                                    }}
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
                        <span
                          className={`doctor-status ${
                            isValid ? 'doctor-status--ready' : 'doctor-status--waiting'
                          }`}
                        >
                          {isValid ? 'Hợp lệ' : 'Chưa đủ ca'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      Không có nhân viên nào trong danh sách
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
                <span
                  className={`doctor-status mt-2 ${
                    isEnough ? 'doctor-status--ready' : 'doctor-status--cancelled'
                  }`}
                >
                  Ca ngày {dayCoverage[index]} · Trực đêm {coverage[index]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <EmergencyReasonModal
        isOpen={isEmergencyModalOpen}
        onClose={() => {
          setIsEmergencyModalOpen(false);
          setScheduleAction(null);
        }}
        onSubmit={(reason) => {
          if (scheduleAction === 'auto') {
            void autoSchedule(reason);
            return;
          }
          void handleSaveWithReason(reason);
        }}
      />
    </div>
  );
}
