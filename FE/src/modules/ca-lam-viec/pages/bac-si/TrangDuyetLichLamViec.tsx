import { useEffect, useMemo, useState } from 'react';
import EmergencyReasonModal from '../../components/EmergencyReasonModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import { useWorkSchedules } from '../../hooks/use-work-schedules';
import { addScheduleDays, getCurrentMonday } from '../../utils/schedule-date';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/modules/bac-si/doctor-workspace.css';

interface DoctorDutyRow {
  id: number;
  code: string;
  name: string;
  assignedDutyDays: number[];
  blockedDutyDays: number[];
}

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MIN_DOCTORS_PER_SPECIALTY = 7;
const MIN_NIGHT_STAFF = 2;
const MIN_DAY_STAFF = [2, 2, 2, 2, 3, 3, 3];
const BALANCED_DUTY_PATTERNS = [
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [5, 0],
  [6, 1],
];

function restDayLabels(dutyDays: number[]) {
  return dutyDays.map((day) =>
    day === DAYS.length - 1 ? 'T2 tuần sau' : DAYS[day + 1],
  );
}

function hasAdjacentDuty(dutyDays: number[]) {
  return dutyDays.some((day) => dutyDays.includes((day + 1) % DAYS.length));
}

function getApiErrorMessage(error: unknown) {
  const axiosError = error as {
    message?: string;
    response?: { data?: { message?: string | string[] } };
  };
  const message = axiosError.response?.data?.message;
  return Array.isArray(message) ? message[0] : message || axiosError.message || 'Có lỗi khi lưu lịch';
}

export default function TrangDuyetLichLamViec() {
  const { departmentSchedule, isLoading, fetchDepartmentSchedule, saveAndPublish } = useWorkSchedules();
  const { showToast } = useAppToast();
  const [weekStart, setWeekStart] = useState(() => getCurrentMonday());
  const [rows, setRows] = useState<DoctorDutyRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  useEffect(() => {
    fetchDepartmentSchedule(weekStart);
  }, [fetchDepartmentSchedule, weekStart]);

  useEffect(() => {
    if (departmentSchedule) {
      setRows(
        departmentSchedule.doctors.map((doc: any) => {
          const assignedDutyDays = doc.days
            .map((day: any, index: number) => (day.workType === 'HANH_CHINH_VA_TRUC_DEM' ? index : -1))
            .filter((index: number) => index !== -1);
          return {
            id: doc.doctor.id,
            code: doc.doctor.code,
            name: doc.doctor.fullName,
            assignedDutyDays,
            blockedDutyDays: doc.blockedDutyDays ?? [],
          };
        }),
      );
    }
  }, [departmentSchedule]);

  const coverage = useMemo(
    () => DAYS.map((_, dayIndex) => rows.filter((row) => row.assignedDutyDays.includes(dayIndex)).length),
    [rows],
  );

  // Ca ngày là lịch hành chính cố định, trừ bác sĩ nghỉ bù sau đêm trực hôm trước.
  const dayCoverage = useMemo(
    () => DAYS.map((_, dayIndex) => (
      dayIndex === 0 ? rows.length : Math.max(0, rows.length - coverage[dayIndex - 1])
    )),
    [coverage, rows.length],
  );
  
  const validDoctors = rows.filter(
    (row) => row.assignedDutyDays.length === 2 && !hasAdjacentDuty(row.assignedDutyDays)
  ).length;
  const hasAssignedDuties = rows.some((row) => row.assignedDutyDays.length > 0);

  const toggleDuty = (doctorId: number, day: number) => {
    setRows((current) => current.map((row) => {
      if (row.id !== doctorId) return row;
      const next = row.assignedDutyDays.includes(day)
        ? row.assignedDutyDays.filter((item) => item !== day)
        : [...row.assignedDutyDays, day].sort((left, right) => left - right);
      if (!row.assignedDutyDays.includes(day) && row.blockedDutyDays.includes(day)) {
        showToast('Không thể xếp ca này vì bác sĩ đã trực ở tuần liền kề', 'warning');
        return row;
      }
      if (!departmentSchedule?.published && next.length > 2) {
        showToast('Chỉ được xếp tối đa 2 ca trực (trừ trường hợp đổi ca khẩn cấp)', 'warning');
        return row;
      }
      if (hasAdjacentDuty(next)) {
        showToast('Không được xếp trực hai đêm liên tiếp', 'warning');
        return row;
      }
      return { ...row, assignedDutyDays: next };
    }));
  };

  const handleSaveWithReason = async (lyDoThayDoi?: string) => {
    if (!departmentSchedule?.published && rows.length < MIN_DOCTORS_PER_SPECIALTY) {
      showToast('Khoa cần tối thiểu 7 bác sĩ để xếp đủ ca ngày và trực đêm', 'warning');
      return;
    }
    if (!departmentSchedule?.published && validDoctors !== rows.length) {
      showToast('Vui lòng phân đủ 2 ca trực hợp lệ cho tất cả bác sĩ', 'warning');
      return;
    }
    if (coverage.some((count) => count < MIN_NIGHT_STAFF)) {
      showToast('Mỗi đêm phải có tối thiểu 2 bác sĩ trực', 'warning');
      return;
    }
    if (dayCoverage.some((count, index) => count < MIN_DAY_STAFF[index])) {
      showToast('Ca ngày chưa đủ nhân sự: Thứ 2–5 cần 2, Thứ 6–Chủ nhật cần 3 bác sĩ', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        weekStart,
        lyDoThayDoi,
        assignments: rows.map((r) => ({
          doctorId: r.id,
          dutyDates: r.assignedDutyDays.map((dayIndex) => addScheduleDays(weekStart, dayIndex)),
        })),
      };
      await saveAndPublish(payload);
      showToast('Đã lưu và công bố lịch làm việc thành công!', 'success');
      fetchDepartmentSchedule(weekStart);
      setIsEmergencyModalOpen(false);
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err), 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (departmentSchedule?.published) {
      setIsEmergencyModalOpen(true);
      return;
    }
    void handleSaveWithReason();
  };

  const handleAutoSchedule = () => {
    if (rows.length < MIN_DOCTORS_PER_SPECIALTY) {
      showToast('Khoa chưa đủ 7 bác sĩ để tự động xếp lịch', 'warning');
      return;
    }

    const newRows = rows.map((row, index) => {
      const patterns = [
        ...BALANCED_DUTY_PATTERNS.slice(index % BALANCED_DUTY_PATTERNS.length),
        ...BALANCED_DUTY_PATTERNS.slice(0, index % BALANCED_DUTY_PATTERNS.length),
      ];
      const pattern = patterns.find((days) => days.every((day) => !row.blockedDutyDays.includes(day)));
      return { ...row, assignedDutyDays: pattern ? [...pattern] : [] };
    });

    if (newRows.some((row) => row.assignedDutyDays.length !== 2)) {
      showToast('Không thể tự xếp do có bác sĩ bị khóa ca ở tuần liền kề', 'warning');
      return;
    }

    setRows(newRows);
    showToast('Đã xếp đủ ca ngày và 2 bác sĩ trực đêm mỗi ngày', 'success');
  };

  if (isLoading && !departmentSchedule) {
    return <div className="p-5 text-center">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="doctor-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="doctor-page__eyebrow">Dành cho trưởng khoa</div>
          <h1 className="doctor-page__title">Phân lịch trực đêm</h1>
          <p className="doctor-page__description">Phân hai ca trực mỗi tuần cho bác sĩ trong khoa; ngày nghỉ bù được tính tự động.</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary bg-white" 
            disabled={isSaving || rows.length === 0} 
            onClick={handleAutoSchedule}
          >
            <span className="material-symbols-outlined align-bottom fs-5 me-1">magic_button</span>
            Tự động xếp lịch
          </button>
          <button 
            className="btn btn-primary" 
            disabled={isSaving || rows.length === 0} 
            onClick={handleSave}
          >
            {isSaving ? 'Đang lưu...' : (departmentSchedule?.published ? 'Cập nhật lại lịch đã công bố' : 'Lưu và công bố lịch')}
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4"><div className="doctor-stat"><div><div className="doctor-stat__value">{rows.length}</div><div className="doctor-stat__label">Bác sĩ trong khoa</div></div></div></div>
        <div className="col-md-4"><div className="doctor-stat"><div><div className="doctor-stat__value">{rows.reduce((total, row) => total + row.assignedDutyDays.length, 0)}</div><div className="doctor-stat__label">Lượt trực đã phân</div></div></div></div>
        <div className="col-md-4"><div className="doctor-stat"><div><div className="doctor-stat__value">{validDoctors}/{rows.length}</div><div className="doctor-stat__label">Bác sĩ đủ hai ca</div></div></div></div>
      </div>

      <div className="alert d-flex align-items-start gap-3 mb-4 shadow-sm border" style={{ backgroundColor: '#f8fafd', borderColor: '#e2e8f0' }}>
        <span className="material-symbols-outlined text-primary fs-4 mt-1">info</span>
        <div className="flex-grow-1">
          <h6 className="fw-bold mb-2 text-primary">Hướng dẫn phân lịch trực đêm</h6>
          <ul className="mb-0 ps-3 small text-secondary" style={{ lineHeight: '1.6' }}>
            <li>Mỗi bác sĩ được phân <strong>2 ca trực đêm/tuần</strong> (16:30–07:00 hôm sau); mỗi đêm có tối thiểu 2 bác sĩ.</li>
            <li><strong>Không được xếp hai đêm liên tiếp.</strong> Hệ thống tự động gạch chéo khóa lại các đêm liền kề để tránh vi phạm.</li>
            <li>Sau khi trực đêm, ngày hôm sau sẽ tự động được đánh dấu là <span className="badge bg-light text-dark border">nghỉ bù</span> và không xếp lịch hành chính (07:00–16:30).</li>
            <li>Ca ngày cần tối thiểu <strong>2 bác sĩ từ Thứ 2–5</strong> và <strong>3 bác sĩ từ Thứ 6–Chủ nhật</strong>.</li>
          </ul>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <strong>Tuần đang xem: {dinhDangNgay(weekStart)}</strong>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary px-3" type="button" onClick={() => setWeekStart(addScheduleDays(weekStart, -7))}>Tuần trước</button>
          <button className="btn btn-outline-primary px-3" type="button" disabled={weekStart === getCurrentMonday()} onClick={() => setWeekStart(getCurrentMonday())}>Tuần này</button>
          <button className="btn btn-outline-primary px-3" type="button" onClick={() => setWeekStart(addScheduleDays(weekStart, 7))}>Tuần sau</button>
        </div>
      </div>

      <section className="doctor-panel overflow-hidden mb-4">
        <div className="p-3 border-bottom d-flex justify-content-between flex-wrap gap-2">
          <div>
          <strong>Tuần bắt đầu từ {dinhDangNgay(weekStart)}</strong>
            <div className="small text-secondary mt-1">{departmentSchedule?.unit?.name || 'Khoa Nội tổng quát'}</div>
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
            Tuần này chưa có lịch trực. Trưởng khoa có thể tự động xếp lịch hoặc chọn ca trực thủ công.
          </div>
        )}

        <div className="table-responsive">
          <table className="table doctor-table align-middle mb-0">
            <thead><tr><th>Bác sĩ</th><th>Lịch hành chính</th><th>Chọn ngày trực đêm</th><th>Nghỉ bù tự động</th><th>Kiểm tra</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const isValid = row.assignedDutyDays.length === 2 && !hasAdjacentDuty(row.assignedDutyDays);
                return <tr key={row.id}>
                  <td><strong>{row.name}</strong><div className="small text-secondary">Mã bác sĩ: {row.code}</div></td>
                  <td><strong>07:00–16:30</strong><div className="small text-secondary">Trừ ngày nghỉ bù</div></td>
                  <td style={{ minWidth: 400 }}>
                    <div className="d-flex flex-wrap gap-2">
                      {DAYS.map((day, index) => {
                        const isSelected = row.assignedDutyDays.includes(index);
                        const isBoundaryBlocked = !isSelected && row.blockedDutyDays.includes(index);
                        const conflicts = !isSelected && (
                          isBoundaryBlocked || row.assignedDutyDays.some((selectedDay) =>
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
                              title={isBoundaryBlocked ? 'Bác sĩ đã trực ở tuần liền kề' : conflicts ? 'Không thể trực hai đêm liên tiếp' : 'Chọn làm ca trực đêm'} 
                              className={`btn btn-sm ${btnClass}`} 
                              style={conflicts 
                                ? { width: '48px', fontWeight: '500', pointerEvents: 'none', background: '#f8f9fa', color: '#ccc', textDecoration: 'line-through' } 
                                : { width: '48px', fontWeight: '500' }
                              }
                              onClick={() => toggleDuty(row.id, index)}
                            >
                              {day}
                            </button>
                            {/* Wrapper span for tooltip when button is disabled */}
                            {conflicts && (
                              <span 
                                title={isBoundaryBlocked ? 'Bác sĩ đã trực ở tuần liền kề' : 'Không thể trực hai đêm liên tiếp'} 
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'not-allowed' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <small className={isValid ? 'text-success' : 'text-danger'}>{row.assignedDutyDays.length}/2 ca trực</small>
                  </td>
                  <td>{restDayLabels(row.assignedDutyDays).join(', ') || 'Chưa có'}</td>
                  <td><span className={`doctor-status ${isValid ? 'doctor-status--ready' : 'doctor-status--waiting'}`}>{isValid ? 'Hợp lệ' : 'Chưa đủ ca'}</span></td>
                </tr>;
              })}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="text-center p-4">Không có bác sĩ nào trong khoa</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="doctor-panel overflow-hidden">
        <div className="p-3 border-bottom"><strong>Nhân sự theo ngày</strong><div className="small text-secondary mt-1">Kiểm tra đồng thời ca ngày và ca trực đêm trước khi công bố.</div></div>
        <div className="row g-0">{DAYS.map((day, index) => {
          const isEnough = coverage[index] >= MIN_NIGHT_STAFF && dayCoverage[index] >= MIN_DAY_STAFF[index];
          return <div className="col border-end p-3 text-center" key={day}>
            <strong className="d-block">{day}</strong>
            <span className={`doctor-status mt-2 ${isEnough ? 'doctor-status--ready' : 'doctor-status--cancelled'}`}>
              Ca ngày {dayCoverage[index]} · Trực đêm {coverage[index]}
            </span>
          </div>;
        })}</div>
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
