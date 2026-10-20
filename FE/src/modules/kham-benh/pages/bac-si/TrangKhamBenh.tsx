import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { examinationApi } from '../../api/examination.api';
import type { PrescriptionWarning, WarningAiSuggestionResult } from '../../types/examination.types';
import { usePrescriptionMedicines } from '@/modules/thuoc/hooks/use-prescription-medicines';
import { KhamChuyenKhoa } from '../../components/kham-chuyen-khoa/KhamChuyenKhoa';
import '@/modules/bac-si/doctor-workspace.css';
import './TrangKhamBenh.css';

const LOCAL_DRAFT_PREFIX = 'smart_clinic_draft_';

function getLocalDraftKey(id: number) {
  return `${LOCAL_DRAFT_PREFIX}${id}`;
}

function saveLocalDraft(id: number, data: any) {
  try {
    localStorage.setItem(
      getLocalDraftKey(id),
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch (e) {
    console.warn('Không thể lưu draft vào localStorage', e);
  }
}

function getLocalDraft(id: number) {
  try {
    const raw = localStorage.getItem(getLocalDraftKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearLocalDraft(id: number) {
  try {
    localStorage.removeItem(getLocalDraftKey(id));
  } catch (e) {
    console.warn('Không thể xóa draft khỏi localStorage', e);
  }
}

function formatVietnameseDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

export default function TrangKhamBenh() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useAppToast();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [vitals, setVitals] = useState({ bloodPressure: '', heartRate: '', temperature: '' });
  const [symptoms, setSymptoms] = useState('');
  const [specialtyContent, setSpecialtyContent] = useState<Record<string, string | number | null>>({});
  const [diagnosis, setDiagnosis] = useState('');
  const [icd10Code, setIcd10Code] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [, setIsAutoSaving] = useState(false);
  const [isSafetyChecking, setIsSafetyChecking] = useState(false);
  const [, setLastSavedAt] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<PrescriptionWarning[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<Record<number, WarningAiSuggestionResult>>({});
  const [aiSuggestionMessages, setAiSuggestionMessages] = useState<Record<number, string>>({});
  const [explainingWarningId, setExplainingWarningId] = useState<number | null>(null);
  const [showPrescriptionValidation, setShowPrescriptionValidation] = useState(false);
  const [warningToDismiss, setWarningToDismiss] = useState<PrescriptionWarning | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [showCompleteWithoutMedicineModal, setShowCompleteWithoutMedicineModal] = useState(false);
  const [completionValidation, setCompletionValidation] = useState({
    symptoms: false,
    diagnosis: false,
    conclusion: false,
  });
  const [medicineSearch, setMedicineSearch] = useState('');
  const [activePrescriptionIndex, setActivePrescriptionIndex] = useState<number | null>(null);
  const draftHydratedRef = useRef<number | null>(null);
  const safetyCheckKeyRef = useRef('');
  const followUpDatePickerRef = useRef<HTMLInputElement>(null);
  const diagnosisRef = useRef<HTMLInputElement>(null);
  const conclusionRef = useRef<HTMLTextAreaElement>(null);
  const symptomsRef = useRef<HTMLTextAreaElement>(null);

  const openFollowUpDatePicker = () => {
    const picker = followUpDatePickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.click();
    }
  };

  const [prescriptions, setPrescriptions] = useState([
    { medicineId: '', medicineKeyword: '', quantity: '1', dosage: '', frequency: '', days: '1', instructions: '' },
  ]);
  const { medicines, isLoading: isMedicineLoading, error: medicineError } = usePrescriptionMedicines(medicineSearch);
  const allergyWarnings = useMemo(
    () => warnings.filter((warning) => warning.type === 'DI_UNG_THUOC'),
    [warnings],
  );

  // --- Tải thông tin lượt khám theo luotKhamId hoặc tự khôi phục lượt khám đang mở ---
  const luotKhamId = Number(searchParams.get('luotKhamId'));
  const [visit, setVisit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeVisitId = luotKhamId || visit?.id;

  const loadWarnings = useCallback(async (targetVisitId?: number) => {
    const id = targetVisitId || activeVisitId;
    if (!id || isNaN(id)) return;
    try {
      const response = await examinationApi.getWarnings(id);
      setWarnings(response.data.data ?? []);
    } catch {
      // Chưa có đơn thuốc thì không hiển thị cảnh báo và không chặn thao tác khám.
      setWarnings([]);
    }
  }, [activeVisitId]);

  const reload = useCallback(async () => {
    let currentId = luotKhamId;
    if (!currentId || isNaN(currentId)) {
      setIsLoading(true);
      setError(null);
      try {
        const activeRes = await examinationApi.getActiveVisit();
        if (activeRes.data.data?.id) {
          currentId = activeRes.data.data.id;
          navigate(`/bac-si/kham-benh?luotKhamId=${currentId}`, { replace: true });
        } else {
          setIsLoading(false);
          return;
        }
      } catch {
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await examinationApi.getVisit(currentId);
      const visitData = response.data.data;
      setVisit(visitData);
      const draft = visitData?.draft;

      // So sánh dữ liệu nháp trên server và bộ nhớ tạm localStorage
      const localDraft = getLocalDraft(currentId);
      const serverUpdatedTime = draft?.updatedAt ? new Date(draft.updatedAt).getTime() : 0;
      const shouldUseLocal = localDraft && (
        !draft ||
        (localDraft.savedAt && localDraft.savedAt > serverUpdatedTime) ||
        (localDraft.symptoms && !draft.trieuChung && !draft.symptoms) ||
        (localDraft.diagnosis && !draft.chanDoan && !draft.diagnosis)
      );

      if (shouldUseLocal && draftHydratedRef.current !== currentId) {
        draftHydratedRef.current = currentId;
        if (localDraft.vitals) setVitals(localDraft.vitals);
        if (localDraft.symptoms !== undefined) setSymptoms(localDraft.symptoms);
        if (localDraft.specialtyContent) setSpecialtyContent(localDraft.specialtyContent);
        if (localDraft.diagnosis !== undefined) setDiagnosis(localDraft.diagnosis);
        if (localDraft.icd10Code !== undefined) setIcd10Code(localDraft.icd10Code);
        if (localDraft.conclusion !== undefined) setConclusion(localDraft.conclusion);
        if (localDraft.doctorNotes !== undefined) setDoctorNotes(localDraft.doctorNotes);
        if (localDraft.followUpDate !== undefined) setFollowUpDate(localDraft.followUpDate);
        if (localDraft.prescriptions?.length) setPrescriptions(localDraft.prescriptions);
        setLastSavedAt(draft?.updatedAt ?? draft?.submittedAt ?? null);
        setIsDirty(true);
        showToast('Đã khôi phục dữ liệu phiên khám chưa lưu từ phiên trước', 'info');
      } else if (draft && draftHydratedRef.current !== draft.id) {
        draftHydratedRef.current = draft.id;
        setVitals({
          bloodPressure: String(draft.vitals?.bloodPressure ?? ''),
          heartRate: String(draft.vitals?.heartRate ?? ''),
          temperature: String(draft.vitals?.temperature ?? ''),
        });
        setSymptoms(draft.symptoms ?? '');
        // Ưu tiên dữ liệu JSONB chuyên khoa, vẫn đọc nội dung cũ để không mất hồ sơ trước đây.
        setSpecialtyContent(draft.specialtyData ?? draft.specialtyContent ?? {});
        setDiagnosis(draft.diagnosis ?? '');
        setIcd10Code(draft.icd10Code ?? '');
        setConclusion(draft.conclusion ?? '');
        setDoctorNotes(draft.doctorNotes ?? '');
        setFollowUpDate(draft.followUpDate ? draft.followUpDate.slice(0, 10) : '');
        setPrescriptions(
          draft.prescription?.items?.length
            ? draft.prescription.items.map((item: any) => ({
                medicineId: String(item.medicine.id),
                medicineKeyword: item.medicine.name,
                quantity: String(item.quantity),
                dosage: item.dosage ?? '',
                frequency: item.frequency ?? '',
                days: String(item.days ?? 1),
                instructions: item.instructions ?? '',
              }))
            : [{ medicineId: '', medicineKeyword: '', quantity: '1', dosage: '', frequency: '', days: '1', instructions: '' }],
        );
        setLastSavedAt(draft.updatedAt ?? draft.submittedAt ?? null);
        setIsDirty(false);
      }
      await loadWarnings(currentId);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải thông tin lượt khám');
    } finally {
      setIsLoading(false);
    }
  }, [loadWarnings, luotKhamId, navigate, showToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Cảnh báo do hệ thống vừa sinh phải xuất hiện ngay tại hồ sơ bác sĩ đang mở.
  useRealtimeEvent<{ prescriptionId: number }>(
    'prescription.warning_created',
    useCallback(() => {
      void loadWarnings();
    }, [loadWarnings]),
  );

  const payload = useMemo(() => ({
    vitals: {
      bloodPressure: vitals.bloodPressure || null,
      heartRate: vitals.heartRate ? Number(vitals.heartRate) : null,
      temperature: vitals.temperature ? Number(vitals.temperature) : null,
    },
    specialtyContent,
    specialtyData: specialtyContent,
    symptoms,
    diagnosis,
    icd10Code,
    conclusion,
    doctorNotes,
    followUpDate: followUpDate || undefined,
    prescription: prescriptions.filter((p) => p.medicineId).map((p) => ({
      medicineId: Number(p.medicineId),
      quantity: Number(p.quantity),
      dosage: p.dosage,
      frequency: p.frequency,
      days: Number(p.days),
      instructions: p.instructions || undefined,
    })),
  }), [conclusion, diagnosis, doctorNotes, followUpDate, icd10Code, prescriptions, specialtyContent, symptoms, vitals]);

  // Chỉ kiểm tra lại an toàn khi nội dung đơn thay đổi, không chờ chu kỳ tự lưu 4 giây.
  const prescriptionSafetyKey = useMemo(
    () => JSON.stringify(payload.prescription.map((item) => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      dosage: item.dosage,
      instructions: item.instructions ?? '',
    }))),
    [payload.prescription],
  );

  const saveDraft = useCallback(async (silent = false) => {
    const currentVisitId = luotKhamId || visit?.id;
    if (!visit || !currentVisitId) return false;
    try {
      if (silent) setIsAutoSaving(true);
      const response = await examinationApi.saveDraft(currentVisitId, payload);
      setLastSavedAt(response.data.data?.updatedAt ?? new Date().toISOString());
      setWarnings(response.data.data?.warnings ?? []);
      setIsDirty(false);
      if (!silent) showToast('Đã lưu nháp hồ sơ khám');
      return true;
    } catch {
      if (!silent) showToast('Có lỗi xảy ra khi lưu bản nháp', 'danger');
      return false;
    } finally {
      if (silent) setIsAutoSaving(false);
    }
  }, [luotKhamId, payload, showToast, visit]);

  // Lưu đệm localStorage tức thời để chống mất dữ liệu khi mất mạng hoặc F5
  useEffect(() => {
    const currentVisitId = luotKhamId || visit?.id;
    if (!visit || !currentVisitId) return;
    saveLocalDraft(currentVisitId, {
      vitals,
      symptoms,
      specialtyContent,
      diagnosis,
      icd10Code,
      conclusion,
      doctorNotes,
      followUpDate,
      prescriptions,
    });
  }, [conclusion, diagnosis, doctorNotes, followUpDate, icd10Code, luotKhamId, prescriptions, specialtyContent, symptoms, visit, vitals]);

  // Lắng nghe sự kiện Online/Offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Đã kết nối lại và đồng bộ dữ liệu khám lên hệ thống', 'success');
      void saveDraft(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Mất kết nối mạng. Dữ liệu đang được lưu tạm trên máy.', 'warning');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [saveDraft, showToast]);

  useEffect(() => {
    if (!visit || !isDirty || isSubmitting) return undefined;
    const timer = window.setTimeout(() => { void saveDraft(true); }, 4000);
    return () => window.clearTimeout(timer);
  }, [isDirty, isSubmitting, saveDraft, visit]);

  useEffect(() => {
    if (!visit || !luotKhamId || !prescriptionSafetyKey) {
      if (!prescriptionSafetyKey) setWarnings([]);
      return undefined;
    }
    if (safetyCheckKeyRef.current === prescriptionSafetyKey) return undefined;

    // Gửi bản nháp nhẹ sau khi bác sĩ dừng gõ để nhận cảnh báo ngay trong panel bên phải.
    setWarnings([]);
    setIsSafetyChecking(true);
    const timer = window.setTimeout(() => {
      void saveDraft(true)
        .then((saved) => {
          if (saved) safetyCheckKeyRef.current = prescriptionSafetyKey;
        })
        .finally(() => setIsSafetyChecking(false));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [luotKhamId, prescriptionSafetyKey, saveDraft, visit]);

  const handleSave = async (
    status: 'draft' | 'complete',
    confirmWithoutMedicine = false,
  ) => {
    if (!visit) return;
    if (status === 'draft') {
      await saveDraft();
      return;
    }
    const missingSymptoms = !symptoms.trim();
    const missingDiagnosis = !diagnosis.trim();
    const missingConclusion = !conclusion.trim();
    if (missingSymptoms || missingDiagnosis || missingConclusion) {
      setCompletionValidation({
        symptoms: missingSymptoms,
        diagnosis: missingDiagnosis,
        conclusion: missingConclusion,
      });
      const missingFields = [
        missingSymptoms ? 'triệu chứng' : '',
        missingDiagnosis ? 'chẩn đoán' : '',
        missingConclusion ? 'kết luận và dặn dò' : '',
      ].filter(Boolean);
      showToast(
        `Vui lòng nhập ${missingFields.join(' và ')} trước khi hoàn tất`,
        'warning',
      );
      const target = missingSymptoms ? symptomsRef.current : missingDiagnosis ? diagnosisRef.current : conclusionRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => target?.focus(), 300);
      return;
    }
    setCompletionValidation({ symptoms: false, diagnosis: false, conclusion: false });
    if (!payload.prescription.length && !confirmWithoutMedicine) {
      setShowCompleteWithoutMedicineModal(true);
      return;
    }
    const hasInvalidPrescription = prescriptions.some(
      (line) => line.medicineId && (!line.dosage.trim() || !line.instructions.trim()),
    );
    if (hasInvalidPrescription) {
      setShowPrescriptionValidation(true);
      showToast(
        'Vui lòng nhập đủ liều dùng và cách dùng cho các thuốc đã chọn',
        'warning',
      );
      return;
    }
    setShowPrescriptionValidation(false);
    setIsSubmitting(true);
    const targetVisitId = luotKhamId || visit.id;
    try {
      await examinationApi.complete(targetVisitId, payload);
      setIsDirty(false);
      clearLocalDraft(targetVisitId);
      const hasPrescription = payload.prescription && payload.prescription.length > 0;
      showToast(
        hasPrescription
          ? 'Đã hoàn tất khám bệnh và chuyển đơn sang Dược sĩ'
          : 'Đã hoàn tất khám bệnh thành công',
        'success',
      );
      navigate('/bac-si/hang-doi');
    } catch (error: any) {
      console.error(error);
      const responseData = error?.response?.data;
      let message = responseData?.message;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        const fieldErrors = responseData.errors
          .map((e: any) => Object.values(e.constraints || {}).join(', '))
          .filter(Boolean)
          .join('; ');
        if (fieldErrors) {
          message = `${message}: ${fieldErrors}`;
        }
      }
      if (Array.isArray(message)) {
        message = message.join(', ');
      }
      showToast(message || 'Có lỗi xảy ra khi hoàn tất hồ sơ', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveWarning = async (
    warning: PrescriptionWarning,
    status: 'DA_XAC_NHAN' | 'DA_BO_QUA',
    reason?: string,
  ) => {
    const previousWarnings = warnings;
    setWarnings((current) =>
      current.map((item) =>
        item.id === warning.id ? { ...item, status, reason: reason ?? null } : item,
      ),
    );
    setWarningToDismiss(null);
    setDismissReason('');
    showToast(
      status === 'DA_XAC_NHAN'
        ? 'Đã xác nhận cảnh báo'
        : 'Đã ghi nhận lý do bỏ qua cảnh báo',
    );
    try {
      await examinationApi.resolveWarning(warning.id, { status, reason });
    } catch (requestError: any) {
      setWarnings(previousWarnings);
      showToast(
        requestError?.response?.data?.message || 'Không thể xử lý cảnh báo',
        'danger',
      );
    }
  };

  // Chỉ yêu cầu Gemini xếp hạng ứng viên sau khi bác sĩ chủ động bấm xem.
  const loadAiSuggestions = async (warningId: number) => {
    if (!luotKhamId) return;
    setAiSuggestions((current) => {
      const next = { ...current };
      delete next[warningId];
      return next;
    });
    setAiSuggestionMessages((current) => {
      const next = { ...current };
      delete next[warningId];
      return next;
    });
    setExplainingWarningId(warningId);
    showToast('Đang phân tích gợi ý thuốc...', 'info');
    try {
      const response = await examinationApi.getWarningAiSuggestions(luotKhamId, warningId);
      setAiSuggestions((current) => ({
        ...current,
        [warningId]: response.data.data,
      }));
    } catch {
      const message = 'Không thể tải gợi ý AI lúc này. Cảnh báo dị ứng vẫn có hiệu lực.';
      setAiSuggestionMessages((current) => ({ ...current, [warningId]: message }));
      showToast(message, 'danger');
    } finally {
      setExplainingWarningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="doctor-page doctor-panel doctor-coming-soon">
        <div>
          <div className="spinner-border text-primary mb-3" role="status" />
          <div>Đang tải thông tin bệnh nhân...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="doctor-page doctor-panel doctor-coming-soon">
        <div>
          <span className="material-symbols-outlined text-danger fs-1">
            error
          </span>
          <p className="text-danger mt-2">{error}</p>
          <button className="btn btn-outline-primary" onClick={() => void reload()}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="doctor-page doctor-panel doctor-coming-soon">
        <div>
          <span className="material-symbols-outlined text-primary fs-1">stethoscope</span>
          <h1 className="h4 fw-bold mt-2">Chưa chọn bệnh nhân để khám</h1>
          <p className="text-secondary">
            Hãy vào Hàng đợi, gọi bệnh nhân và bấm "Vào phòng khám".
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/bac-si/hang-doi')}>
            Mở hàng đợi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-page doctor-examination-page">
      <div className="mb-4">
        <div className="doctor-page__eyebrow">Phiếu khám điện tử</div>
        <h1 className="doctor-page__title">Khám bệnh</h1>
        <p className="doctor-page__description">
          Ghi nhận sinh hiệu, chẩn đoán và chỉ định cho bệnh nhân.
        </p>
      </div>

      <div className="doctor-exam-shell">
        {!isOnline && (
          <div className="alert alert-warning d-flex align-items-center gap-2 mb-3 shadow-sm w-100">
            <span className="material-symbols-outlined">wifi_off</span>
            <div>
              <strong>Đang mất kết nối mạng.</strong> Dữ liệu khám đang được tự động lưu tạm trên máy của bạn và sẽ đồng bộ lại ngay khi có mạng.
            </div>
          </div>
        )}
        <form className="doctor-panel overflow-hidden" onSubmit={(event) => event.preventDefault()} onChange={() => setIsDirty(true)}>
          <section className="doctor-exam-patient-bar">
            <div className="doctor-patient__avatar">
              {visit.patient.fullName.split(' ').slice(-2).map((part: string) => part[0]).join('')}
            </div>
            <div>
              <div className="small text-secondary">BỆNH NHÂN ĐANG KHÁM</div>
              <strong>{visit.patient.fullName}</strong>
              <div className="small text-secondary">
                {visit.patient.code} · {visit.patient.phoneNumber}
              </div>
            </div>
          </section>
          {/* DỊ ỨNG BỆNH NHÂN */}
          <section className={`doctor-patient-allergies ${visit.patient.allergies?.length ? 'doctor-patient-allergies--has-data' : ''}`} aria-live="polite">
            <span className="material-symbols-outlined">health_and_safety</span>
            <div>
              <strong>{visit.patient.allergies?.length ? 'Dị ứng đã ghi nhận' : 'Chưa ghi nhận dị ứng'}</strong>
              {visit.patient.allergies?.length ? (
                <ul>
                  {visit.patient.allergies.map((allergy: any) => (
                    <li key={allergy.id}>
                      <b>{allergy.agent}</b>
                      {allergy.reaction ? ` — ${allergy.reaction}` : ''}
                      <small>{allergy.confirmationStatus === 'DA_XAC_NHAN' ? 'Đã xác nhận y tế' : 'Cần xác nhận lại với bệnh nhân'}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Hỏi lại bệnh nhân về tiền sử dị ứng trước khi kê đơn. Không xem đây là xác nhận không dị ứng.</p>
              )}
            </div>
          </section>
          <section className="doctor-form-section">
            <h2>Thông tin khám và sinh hiệu</h2>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Huyết áp (mmHg)</label>
                <input className="form-control" placeholder="120/80" value={vitals.bloodPressure} onChange={(e) => setVitals({...vitals, bloodPressure: e.target.value})} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Nhịp tim (BPM)</label>
                <input className="form-control" type="number" placeholder="75" value={vitals.heartRate} onChange={(e) => setVitals({...vitals, heartRate: e.target.value})} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Nhiệt độ (°C)</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.1"
                  placeholder="36.8"
                  value={vitals.temperature} onChange={(e) => setVitals({...vitals, temperature: e.target.value})}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Triệu chứng lâm sàng <span className="text-danger">*</span></label>
                <textarea 
                  ref={symptomsRef}
                  className={`form-control ${completionValidation.symptoms ? 'is-invalid' : ''}`}
                  rows={3} 
                  value={symptoms} 
                  onChange={(e) => setSymptoms(e.target.value)} 
                />
                {completionValidation.symptoms && (
                  <div className="invalid-feedback">Vui lòng nhập triệu chứng lâm sàng.</div>
                )}
              </div>
            </div>
          </section>

          <KhamChuyenKhoa
            maChuyenKhoa={visit.specialty?.code}
            value={specialtyContent}
            onChange={setSpecialtyContent}
          />

          <section className="doctor-form-section">
            <h2>Chẩn đoán</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">
                  Chẩn đoán chính <span className="text-danger">*</span>
                </label>
                <input
                  ref={diagnosisRef}
                  className={`form-control ${completionValidation.diagnosis ? 'is-invalid' : ''}`}
                  placeholder="Nhập chẩn đoán..."
                  value={diagnosis}
                  onChange={(e) => {
                    setDiagnosis(e.target.value);
                    if (completionValidation.diagnosis) {
                      setCompletionValidation((current) => ({ ...current, diagnosis: false }));
                    }
                  }}
                />
                {completionValidation.diagnosis ? (
                  <div className="invalid-feedback">Vui lòng nhập chẩn đoán chính.</div>
                ) : null}
              </div>
              <div className="col-md-6">
                <label className="form-label">Mã ICD-10</label>
                <input className="form-control" placeholder="Ví dụ: J02.9" value={icd10Code} onChange={(e) => setIcd10Code(e.target.value)} />
              </div>
              <div className="col-12">
                <label className="form-label">Ghi chú chẩn đoán</label>
                <textarea className="form-control" rows={3} value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="doctor-form-section">
            <h2 className="d-flex align-items-center gap-1">
              Kết luận và dặn dò <span className="text-danger">*</span>
            </h2>
            <textarea
              ref={conclusionRef}
              className={`form-control mb-3 ${completionValidation.conclusion ? 'is-invalid' : ''}`}
              rows={4}
              placeholder="Kết luận, hướng dẫn theo dõi và lưu ý cho bệnh nhân..."
              value={conclusion}
              onChange={(e) => {
                setConclusion(e.target.value);
                if (completionValidation.conclusion) {
                  setCompletionValidation((current) => ({ ...current, conclusion: false }));
                }
              }}
            />
            {completionValidation.conclusion ? (
              <div className="invalid-feedback d-block mt-n2 mb-3">
                Vui lòng nhập kết luận và dặn dò cho bệnh nhân.
              </div>
            ) : null}
            <label className="form-label" htmlFor="follow-up-date-display">Ngày tái khám</label>
            <div className="input-group position-relative" style={{ maxWidth: 240 }}>
              <input
                id="follow-up-date-display"
                className="form-control"
                type="text"
                placeholder="dd/mm/yyyy"
                readOnly
                value={formatVietnameseDate(followUpDate)}
                onClick={openFollowUpDatePicker}
              />
              <button
                className="btn btn-outline-secondary"
                type="button"
                aria-label="Chọn ngày tái khám"
                onClick={openFollowUpDatePicker}
              >
                <span className="material-symbols-outlined">calendar_month</span>
              </button>
              <input
                ref={followUpDatePickerRef}
                className="position-absolute opacity-0"
                style={{ width: 1, height: 1, pointerEvents: 'none' }}
                type="date"
                value={followUpDate}
                onChange={(event) => setFollowUpDate(event.target.value)}
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </section>

          <section className="doctor-form-section">
            <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
              <div>
                <h2 className="mb-1">Kê đơn thuốc</h2>
                <p className="text-secondary mb-0">
                  Chọn thuốc, số lượng và hướng dẫn sử dụng cho bệnh nhân.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() =>
                  setPrescriptions((current) => [
                    ...current,
                    { medicineId: '', medicineKeyword: '', quantity: '1', dosage: '', frequency: '', days: '1', instructions: '' },
                  ])
                }
              >
                <span className="material-symbols-outlined me-1">add</span>
                Thêm thuốc
              </button>
            </div>
            <div className="d-grid gap-3">
              {prescriptions.map((item, index) => (
                <div className="border rounded-3 p-3" key={index}>
                  <div className="row g-3 align-items-start">
                    <div className="col-lg-12">
                      <label className="form-label">Thuốc</label>
                      <div className="position-relative">
                        <div className="input-group">
                          <span className="input-group-text"><span className="material-symbols-outlined">search</span></span>
                          <input
                            className="form-control"
                            required
                            value={item.medicineKeyword}
                            placeholder="Gõ tên thuốc hoặc hoạt chất để tìm..."
                            onFocus={() => {
                              setActivePrescriptionIndex(index);
                              setMedicineSearch(item.medicineKeyword);
                            }}
                            onChange={(event) => {
                              const keyword = event.target.value;
                              setMedicineSearch(keyword);
                              setActivePrescriptionIndex(index);
                              setPrescriptions((current) => current.map((row, rowIndex) => rowIndex === index
                                ? { ...row, medicineKeyword: keyword, medicineId: '' }
                                : row));
                            }}
                            onBlur={() => window.setTimeout(() => setActivePrescriptionIndex(null), 150)}
                          />
                        </div>
                        {activePrescriptionIndex === index && medicineSearch.trim() && (
                          <div className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 20, maxHeight: 260, overflowY: 'auto' }}>
                            {isMedicineLoading && <div className="list-group-item text-secondary">Đang tìm thuốc...</div>}
                            {!isMedicineLoading && medicineError && <div className="list-group-item text-danger">{medicineError}</div>}
                            {!isMedicineLoading && !medicineError && medicines.length === 0 && <div className="list-group-item text-secondary">Không tìm thấy thuốc phù hợp.</div>}
                            {!isMedicineLoading && medicines.map((medicine) => {
                              const outOfStock = medicine.soLuongTon <= 0;
                              return <button key={medicine.id} type="button" className="list-group-item list-group-item-action" disabled={outOfStock} onMouseDown={(event) => event.preventDefault()} onClick={() => {
                                setPrescriptions((current) => current.map((row, rowIndex) => rowIndex === index
                                  ? { ...row, medicineId: String(medicine.id), medicineKeyword: medicine.tenThuoc }
                                  : row));
                                setMedicineSearch('');
                                setActivePrescriptionIndex(null);
                              }}>
                                <strong>{medicine.tenThuoc}</strong>
                                <small className="d-block text-secondary">{medicine.hoatChat || 'Chưa cập nhật hoạt chất'} · {medicine.donViTinh} · Tồn: {medicine.soLuongTon} {medicine.donViTinh}{outOfStock ? ' · Hết hàng' : ''}</small>
                              </button>;
                            })}
                          </div>
                        )}
                      </div>
                      {item.medicineId && <small className="text-success d-block mt-1">Đã chọn thuốc trong kho.</small>}
                    </div>
                    <div className="col-sm-4 col-lg-2">
                      <label className="form-label">Số lượng</label>
                      <input
                        className="form-control"
                        min="1"
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          setPrescriptions((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, quantity: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="col-sm-4 col-lg-2">
                      <label className="form-label">Số ngày</label>
                      <input
                        className="form-control"
                        min="1"
                        type="number"
                        value={item.days}
                        onChange={(event) =>
                          setPrescriptions((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, days: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="col-sm-4 col-lg-3">
                      <label className="form-label">
                        Liều dùng {item.medicineId && <span className="text-danger">*</span>}
                      </label>
                      <input
                        className={`form-control ${showPrescriptionValidation && item.medicineId && !item.dosage.trim() ? 'is-invalid' : ''}`}
                        placeholder="Ví dụ: 1 viên"
                        value={item.dosage}
                        onChange={(event) =>
                          setPrescriptions((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, dosage: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      {showPrescriptionValidation && item.medicineId && !item.dosage.trim() && (
                        <div className="invalid-feedback">Vui lòng nhập liều dùng.</div>
                      )}
                    </div>
                    <div className="col-sm-4 col-lg-3">
                      <label className="form-label">Tần suất</label>
                      <input
                        className="form-control"
                        placeholder="Ví dụ: 2 lần/ngày"
                        value={item.frequency}
                        onChange={(event) =>
                          setPrescriptions((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, frequency: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="col-sm-8 col-lg-12">
                      <label className="form-label">
                        Cách dùng / Chỉ dẫn thêm {item.medicineId && <span className="text-danger">*</span>}
                      </label>
                      <input
                        className={`form-control ${showPrescriptionValidation && item.medicineId && !item.instructions.trim() ? 'is-invalid' : ''}`}
                        placeholder="Ví dụ: Uống sau ăn"
                        value={item.instructions}
                        onChange={(event) =>
                          setPrescriptions((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, instructions: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      {showPrescriptionValidation && item.medicineId && !item.instructions.trim() && (
                        <div className="invalid-feedback">Vui lòng nhập cách dùng.</div>
                      )}
                    </div>
                    <div className="col-lg-1 text-end">
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        disabled={prescriptions.length === 1}
                        onClick={() =>
                          setPrescriptions((current) =>
                            current.filter((_, rowIndex) => rowIndex !== index),
                          )
                        }
                        title="Bỏ thuốc"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="d-flex flex-wrap justify-content-end gap-2 p-3 bg-light">
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={isSubmitting}
              onClick={() => void handleSave('draft')}
            >
              Lưu nháp
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isSubmitting}
              onClick={() => void handleSave('complete')}
            >
              {isSubmitting ? 'Đang lưu...' : 'Hoàn tất khám & chuyển Dược'}
            </button>
          </div>
        </form>

        <aside className="doctor-exam-aside">
          <div className="doctor-patient-summary">
            <div className="small opacity-75 mb-2">BỆNH NHÂN ĐANG KHÁM</div>
            <h2 className="h5 fw-bold">{visit.patient.fullName}</h2>
            <div className="opacity-75">{visit.patient.code}</div>
            <hr className="border-light opacity-25" />
            <div className="small opacity-75">Lý do khám</div>
            <div className="mt-1">
              {visit.reason || 'Chưa ghi nhận'}
            </div>
            <div className="small opacity-75 mt-3">Liên hệ</div>
            <div className="mt-1">{visit.patient.phoneNumber}</div>
          </div>
          <section className="doctor-safety-panel mt-3" aria-live="polite">
            <div className="doctor-safety-panel__header">
              <div>
                <div className="doctor-safety-panel__eyebrow">KIỂM TRA ĐƠN</div>
                <h2>Cảnh báo an toàn</h2>
              </div>
              {isSafetyChecking && <span className="doctor-safety-panel__loading">Đang kiểm tra...</span>}
            </div>
            {allergyWarnings.length === 0 && !isSafetyChecking && (
              <div className="doctor-safety-panel__empty">
                <span className="material-symbols-outlined">verified_user</span>
                Chưa phát hiện xung đột dị ứng trong đơn thuốc.
              </div>
            )}
            <div className="doctor-safety-panel__list">
              {allergyWarnings.map((warning) => {
                const pending = warning.status === 'CHO_XU_LY';
                const isIgnoring = warningToDismiss?.id === warning.id;
                const isAnalyzing = explainingWarningId === warning.id;
                const aiResult = aiSuggestions[warning.id];
                const aiMessage = aiSuggestionMessages[warning.id];
                return (
                  <div className="doctor-warning-group" key={warning.id}>
                    <article className="doctor-safety-alert doctor-safety-alert--critical">
                      <div className="doctor-safety-alert__icon">
                        <span className="material-symbols-outlined">warning</span>
                      </div>
                      <div className="doctor-safety-alert__body">
                        <strong>Cảnh báo dị ứng đã ghi nhận</strong>
                        <dl className="doctor-allergy-facts">
                          <div><dt>Dị ứng</dt><dd>{warning.allergyName || 'Chưa xác định tác nhân'}</dd></div>
                          <div><dt>Thuốc đang kê</dt><dd>{warning.medicineName || 'Chưa xác định thuốc'}</dd></div>
                          <div><dt>Hoạt chất xung đột</dt><dd>{warning.conflictingIngredientName || warning.ingredientName || 'Trùng trực tiếp theo tên thuốc'}</dd></div>
                          <div><dt>Mức độ</dt><dd>{warning.severity === 'NGHIEM_TRONG' ? 'Nghiêm trọng' : 'Cần thận trọng'}</dd></div>
                        </dl>
                        <p>{warning.content}</p>
                        {warning.allergyReaction && <small>Phản ứng đã ghi nhận: {warning.allergyReaction}</small>}
                        <div className="doctor-safety-alert__actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            disabled={isAnalyzing}
                            onClick={() => void loadAiSuggestions(warning.id)}
                          >
                            {isAnalyzing ? 'Đang phân tích...' : 'Xem gợi ý AI'}
                          </button>
                        </div>
                        {pending && !isIgnoring && (
                          <div className="doctor-safety-alert__actions">
                            <button type="button" className="btn btn-sm doctor-warning-ack-button" onClick={() => void resolveWarning(warning, 'DA_XAC_NHAN')}>Đã xem</button>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setWarningToDismiss(warning); setDismissReason(''); }}>Bỏ qua</button>
                          </div>
                        )}
                        {pending && isIgnoring && (
                          <div className="doctor-safety-alert__resolve">
                            <label>Lý do bỏ qua <span className="text-danger">*</span></label>
                            <textarea className="form-control form-control-sm" rows={2} value={dismissReason} onChange={(event) => setDismissReason(event.target.value)} placeholder="Nhập lý do xử lý cảnh báo..." />
                            <div className="d-flex gap-2 mt-2">
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setWarningToDismiss(null); setDismissReason(''); }}>Hủy</button>
                              <button type="button" className="btn btn-sm btn-outline-danger" disabled={!dismissReason.trim()} onClick={() => void resolveWarning(warning, 'DA_BO_QUA', dismissReason)}>Xác nhận bỏ qua</button>
                            </div>
                          </div>
                        )}
                        {!pending && <span className={`doctor-safety-alert__status doctor-safety-alert__status--${warning.status === 'DA_BO_QUA' ? 'skipped' : 'confirmed'}`}>{warning.status === 'DA_BO_QUA' ? 'Đã bỏ qua' : 'Đã xác nhận'}</span>}
                      </div>
                    </article>

                    {(isAnalyzing || aiResult || aiMessage) && (
                      <article className="doctor-ai-card">
                        <div className="doctor-ai-suggestions__heading">
                          <span className="material-symbols-outlined">auto_awesome</span>
                          <strong>Gợi ý thuốc thay thế từ Gemini</strong>
                        </div>
                        {isAnalyzing && (
                          <div className="doctor-ai-card__loading">
                            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                            Đang phân tích dữ liệu khám và thuốc an toàn...
                          </div>
                        )}
                        {aiMessage && <p className="doctor-ai-card__message doctor-ai-card__message--error">{aiMessage}</p>}
                        {aiResult?.status === 'NO_CANDIDATE' && (
                          <p className="doctor-ai-card__message">Chưa tìm thấy thuốc thay thế phù hợp trong dữ liệu hệ thống.</p>
                        )}
                        {aiResult?.status === 'SUCCESS' && (
                          <ol className="doctor-ai-suggestions__list">
                            {aiResult.suggestions.map((suggestion) => (
                              <li key={suggestion.medicineId}>
                                <div><strong>{suggestion.medicineName}</strong><span>{suggestion.unit} · tồn {suggestion.availableQuantity}</span></div>
                                <p>{suggestion.reason}</p>
                              </li>
                            ))}
                          </ol>
                        )}
                        <small className="doctor-ai-suggestions__notice">Thông tin tham khảo cho bác sĩ. AI không tự thay đổi đơn thuốc.</small>
                      </article>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      {showCompleteWithoutMedicineModal && (
        <div className="modal d-block" role="dialog" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
            <div className="modal-header"><h2 className="modal-title fs-5">Hoàn tất khi chưa kê thuốc</h2><button type="button" className="btn-close" onClick={() => setShowCompleteWithoutMedicineModal(false)} /></div>
            <div className="modal-body">Bạn chưa kê thuốc. Bạn có chắc muốn hoàn tất lượt khám này?</div>
            <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={() => setShowCompleteWithoutMedicineModal(false)}>Quay lại</button><button type="button" className="btn btn-primary" onClick={() => { setShowCompleteWithoutMedicineModal(false); void handleSave('complete', true); }}>Hoàn tất khám</button></div>
          </div></div>
        </div>
      )}

    </div>
  );
}
