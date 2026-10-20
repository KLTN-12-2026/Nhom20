import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { doctorApi } from '@/modules/bac-si/api/doctor.api';
import type { Doctor } from '@/modules/bac-si/types/doctor.types';
import { specialtyApi } from '@/modules/chuyen-khoa/api/specialty.api';
import type { Specialty } from '@/modules/chuyen-khoa/types/specialty.types';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import ReceptionistPageHeader from '../../components/ReceptionistPageHeader';
import { useReception } from '../../hooks/use-reception';
import type { ReceptionTicketData } from '../../types/reception-ticket.types';
import type {
  PatientAllergy,
  ReceptionPatient,
  ReceptionRecord,
} from '../../types/reception.types';
import '../../receptionist-workspace.css';

type PatientMode = 'existing' | 'new';
type QueueFilter = 'all' | 'emergency';
// Phân biệt rõ: chưa xác định, không ghi nhận và đã khai có dị ứng.
// DỊ ỨNG BỆNH NHÂN
type AllergyDisclosure = 'CHUA_GHI_NHAN' | 'CO_DI_UNG' | 'CHUA_XAC_DINH';

interface DraftAllergy {
  agent: string;
  reaction: string;
  severity: PatientAllergy['severity'];
}

interface NewPatientForm {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  identityNumber: string;
  healthInsuranceNumber: string;
  email: string;
  address: string;
  specialty: string;
  doctor: string;
  reason: string;
  symptoms: string;
  priority: string;
  note: string;
}

const EMPTY_FORM: NewPatientForm = {
  fullName: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: '',
  identityNumber: '',
  healthInsuranceNumber: '',
  email: '',
  address: '',
  specialty: '',
  doctor: '',
  reason: '',
  symptoms: '',
  priority: 'THONG_THUONG',
  note: '',
};

const EMPTY_ALLERGY: DraftAllergy = {
  agent: '',
  reaction: '',
  severity: 'CHUA_XAC_DINH',
};

const ALLERGY_SEVERITY_LABELS: Record<PatientAllergy['severity'], string> = {
  CHUA_XAC_DINH: 'Chưa xác định mức độ',
  NHE: 'Nhẹ',
  TRUNG_BINH: 'Trung bình',
  NGHIEM_TRONG: 'Nghiêm trọng',
};

const STEPS = [
  ['person', 'Hồ sơ'],
  ['stethoscope', 'Khám bệnh'],
  ['priority_high', 'Ưu tiên'],
  ['task_alt', 'Xác nhận'],
] as const;

const PRIORITIES = [
  {
    code: 'KHAN_CAP',
    icon: 'emergency',
    title: 'Khẩn cấp',
    helper: 'Cần bác sĩ tiếp nhận ngay',
  },
  {
    code: 'TRE_EM',
    icon: 'child_care',
    title: 'Trẻ em',
    helper: 'Trẻ nhỏ cần hỗ trợ',
  },
  {
    code: 'NGUOI_CAO_TUOI',
    icon: 'elderly',
    title: 'Người cao tuổi',
    helper: 'Trên 75 tuổi',
  },
  {
    code: 'MANG_THAI',
    icon: 'pregnant_woman',
    title: 'Phụ nữ mang thai',
    helper: 'Hỗ trợ đặc biệt',
  },
  {
    code: 'THONG_THUONG',
    icon: 'person_check',
    title: 'Thông thường',
    helper: 'Không ưu tiên',
  },
] as const;

const PRIORITY_LABELS: Record<string, string> = {
  KHAN_CAP: 'Khẩn cấp',
  TRE_EM: 'Trẻ em',
  NGUOI_CAO_TUOI: 'Người cao tuổi',
  MANG_THAI: 'Phụ nữ mang thai',
  THONG_THUONG: 'Thông thường',
};

function toVietnameseDate(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const [year, month, day] = isoDate.split('-');
  return day + '/' + month + '/' + year.slice(-2);
}

function toIsoDate(vietnameseDate: string) {
  const match = vietnameseDate.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const [, day, month, year2Digit] = match;
  const numericYear = Number(year2Digit);
  const currentYear = new Date().getFullYear();
  const currentYearLastTwo = currentYear % 100;
  const year = numericYear <= currentYearLastTwo ? 2000 + numericYear : 1900 + numericYear;
  const candidate = new Date(year + '-' + month + '-' + day + 'T00:00:00');
  if (Number.isNaN(candidate.getTime()) || candidate.getDate() !== Number(day) || candidate.getMonth() + 1 !== Number(month)) return null;
  return year + '-' + month + '-' + day;
}

function formatDateTyping(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
}

function formatAllergyReaction(agent: string, reaction?: string | null) {
  const cleanReaction = (reaction ?? '')
    .replace(/\s*\(dữ liệu seed\.?\)/gi, '')
    .trim()
    .replace(/\s+sau khi dùng thuốc\.?$/i, '')
    .trim();

  if (/sau khi dùng\s+[^.]+\.?$/i.test(cleanReaction)) {
    return cleanReaction.endsWith('.') ? cleanReaction : `${cleanReaction}.`;
  }

  return cleanReaction
    ? `${cleanReaction} sau khi dùng ${agent}.`
    : `Đã ghi nhận dị ứng với ${agent}.`;
}

function BirthDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const nativeDateRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(() => toVietnameseDate(value));

  useEffect(() => setDisplayValue(toVietnameseDate(value)), [value]);

  const openCalendar = () => {
    const input = nativeDateRef.current;
    if (!input) return;
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (picker.showPicker) picker.showPicker();
    else input.click();
  };

  return <div className="reception-date-input input-group">
    <input
      id="new-patient-birth"
      className="form-control"
      inputMode="numeric"
      maxLength={8}
      placeholder="dd/mm/yy"
      value={displayValue}
      onChange={(event) => {
        const next = formatDateTyping(event.target.value);
        setDisplayValue(next);
        const iso = toIsoDate(next);
        onChange(iso ?? '');
      }}
      onBlur={() => {
        const iso = toIsoDate(displayValue);
        if (iso) { onChange(iso); setDisplayValue(toVietnameseDate(iso)); }
      }}
    />
    <input ref={nativeDateRef} className="reception-date-input__native" type="date" value={value} onChange={(event) => { onChange(event.target.value); setDisplayValue(toVietnameseDate(event.target.value)); }} tabIndex={-1} aria-hidden="true" />
    <button className="btn btn-outline-secondary" type="button" onClick={openCalendar} aria-label="Chọn ngày sinh"><span className="material-symbols-outlined">calendar_month</span></button>
  </div>;
}

export default function TrangTiepDonBenhNhan() {
  const { showToast } = useAppToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<PatientMode>('existing');
  const [search, setSearch] = useState('');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<NewPatientForm>(EMPTY_FORM);
  const [allergyDisclosure, setAllergyDisclosure] =
    useState<AllergyDisclosure>('CHUA_XAC_DINH');
  const [allergies, setAllergies] = useState<DraftAllergy[]>([]);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [selectedPatient, setSelectedPatient] =
    useState<ReceptionPatient | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    patients,
    queue,
    isSearching,
    isLoadingQueue,
    queueError,
    searchPatients,
    createReception,
  } = useReception();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedQueueNumber, setCompletedQueueNumber] = useState<
    string | null
  >(null);
  const [completedReception, setCompletedReception] =
    useState<ReceptionRecord | null>(null);

  useEffect(() => {
    void Promise.all([specialtyApi.getAll(), doctorApi.getAll()])
      .then(([specialtyResponse, doctorResponse]) => {
        setSpecialties(
          specialtyResponse.data.filter(
            (item) => item.status === 'DANG_HOAT_DONG',
          ),
        );
        setDoctors(
          doctorResponse.data.filter(
            (item) => item.status === 'DANG_HOAT_DONG',
          ),
        );
      })
      .catch((error) =>
        showToast(
          getApiErrorMessage(error, 'Không thể tải chuyên khoa và bác sĩ'),
          'danger',
        ),
      );
  }, [showToast]);

  const availableDoctors = useMemo(
    () =>
      doctors.filter(
        (doctor) => doctor.specialty.id === Number(form.specialty),
      ),
    [doctors, form.specialty],
  );

  const specialtyLabel =
    specialties.find((item) => item.id === Number(form.specialty))?.name ??
    'Chưa chọn';
  const doctorLabel =
    doctors.find((item) => item.id === Number(form.doctor))?.fullName ??
    'Chưa chọn';

  const updateField = (field: keyof NewPatientForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      step === 1 &&
      (!form.fullName.trim() ||
        !form.phoneNumber.trim() ||
        !form.dateOfBirth ||
        !form.gender)
    ) {
      showToast(
        'Vui lòng nhập đủ họ tên, số điện thoại, ngày sinh và giới tính',
        'warning',
      );
      return;
    }
    if (
      step === 1 &&
      allergyDisclosure === 'CO_DI_UNG' &&
      !allergies.some((allergy) => allergy.agent.trim().length >= 2)
    ) {
      showToast('Vui lòng ghi ít nhất một tác nhân dị ứng hoặc chọn “Chưa ghi nhận”', 'warning');
      return;
    }
    if (
      step === 2 &&
      (!form.specialty || !form.doctor || !form.reason.trim())
    ) {
      showToast(
        'Vui lòng chọn chuyên khoa, bác sĩ và nhập lý do khám',
        'warning',
      );
      return;
    }
    if (step < 4) setStep((current) => current + 1);
  };

  const switchMode = (nextMode: PatientMode) => {
    setMode(nextMode);
    setSelectedPatient(null);
    setForm(EMPTY_FORM);
    setAllergyDisclosure('CHUA_XAC_DINH');
    setAllergies([]);
    setSearch('');
    setStep(1);
    setIsCompleted(false);
    setIsConfirmed(false);
    setCompletedQueueNumber(null);
  };

  const filteredQueue = queue.filter((item) => {
    if (queueFilter === 'emergency') return item.priority === 'KHAN_CAP';
    return true;
  });

  const confirmReception = () => {
    setIsConfirmed(true);
  };

  const issueTicket = async () => {
    if (!isConfirmed) return;
    if (isCompleted) return;
    if (!form.specialty || !form.doctor || !form.reason.trim()) {
      showToast('Vui lòng chọn chuyên khoa, bác sĩ và nhập lý do khám', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createReception({
        ...(selectedPatient
          ? { patientId: selectedPatient.id }
          : {
            fullName: form.fullName.trim(),
            phoneNumber: form.phoneNumber.replace(/[\s.-]/g, ''),
            dateOfBirth: form.dateOfBirth,
            gender: form.gender as 'NAM' | 'NU' | 'KHAC',
            email: form.email.trim() || undefined,
            identityNumber: form.identityNumber.trim() || undefined,
            healthInsuranceNumber:
              form.healthInsuranceNumber.trim() || undefined,
            address: form.address.trim() || undefined,
          }),
        specialtyId: Number(form.specialty),
        doctorId: Number(form.doctor),
        reason: form.reason.trim(),
        symptoms: form.symptoms.trim() || undefined,
        priority: form.priority as ReceptionRecord['priority'],
        note: form.note.trim() || undefined,
        allergies:
          allergyDisclosure === 'CO_DI_UNG'
            ? allergies
                .filter((allergy) => allergy.agent.trim().length >= 2)
                .map((allergy) => ({
                  agent: allergy.agent.trim(),
                  reaction: allergy.reaction.trim() || undefined,
                  severity: allergy.severity,
                }))
            : undefined,
      });
      setCompletedReception(response.data);
      setCompletedQueueNumber(response.data.ticket.queueNumber);
      setIsCompleted(true);
      showToast(response.message);
    } catch (error) {
      showToast(
        getApiErrorMessage(error, 'Không thể tiếp đón và cấp phiếu'),
        'danger',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPrintTicket = () => {
    if (!completedQueueNumber) return;
    const ticket: ReceptionTicketData = {
      queueNumber: completedQueueNumber,
      patientName:
        completedReception?.patient.fullName || form.fullName,
      phoneNumber:
        completedReception?.patient.phoneNumber || form.phoneNumber,
      specialty: completedReception?.specialty.name || specialtyLabel,
      doctorAndRoom: `${completedReception?.doctor?.fullName || doctorLabel}${completedReception?.room ? ` · ${completedReception.room.name}` : ''}`,
      priority: PRIORITY_LABELS[form.priority],
      issuedAt: dinhDangNgayGio(new Date()),
    };
    void navigate(`/thu-ngan/tiep-don/phieu/${completedQueueNumber}`, {
      state: ticket,
    });
  };

  const selectPatient = (patient: ReceptionPatient) => {
    setSelectedPatient(patient);
    setForm({
      ...EMPTY_FORM,
      fullName: patient.fullName,
      phoneNumber: patient.phoneNumber,
      dateOfBirth: patient.dateOfBirth ?? '',
      gender: patient.gender ?? '',
      identityNumber: patient.identityNumber ?? '',
      healthInsuranceNumber: patient.healthInsuranceNumber ?? '',
      email: patient.email ?? '',
      address: patient.address ?? '',
    });
    setAllergyDisclosure(
      patient.allergies.length ? 'CO_DI_UNG' : 'CHUA_GHI_NHAN',
    );
    setAllergies(
      patient.allergies.map((allergy) => ({
        agent: allergy.agent,
        reaction: formatAllergyReaction(allergy.agent, allergy.reaction),
        severity: allergy.severity,
      })),
    );
    setStep(2);
    setIsCompleted(false);
    setIsConfirmed(false);
    setCompletedQueueNumber(null);
  };

  const handleSearch = async () => {
    const keyword = search.trim();
    if (keyword.length < 2) {
      showToast('Nhập ít nhất 2 ký tự hoặc số để tìm kiếm', 'warning');
      return;
    }
    try {
      await searchPatients(keyword);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Không thể tìm bệnh nhân',
        'danger',
      );
    }
  };

  return (
    <div className="reception-page">
      <ReceptionistPageHeader
        eyebrow="Quy trình tiếp nhận"
        title="Tiếp đón bệnh nhân"
        description="Tra cứu bệnh nhân cũ hoặc tạo đầy đủ hồ sơ cho bệnh nhân đến khám lần đầu."
      />
      <div className="reception-grid">
        <section className="reception-card overflow-hidden">
          <div className="p-3 border-bottom">
            <div className="btn-group w-100" role="group" aria-label="Loại bệnh nhân">
              <button
                type="button"
                className={`btn ${mode === 'existing' ? 'btn-primary' : 'btn-outline-primary'
                  }`}
                onClick={() => switchMode('existing')}
              >
                <span className="material-symbols-outlined me-2">history</span>
                Bệnh nhân cũ
              </button>
              <button
                type="button"
                className={`btn ${mode === 'new' ? 'btn-primary' : 'btn-outline-primary'
                  }`}
                onClick={() => switchMode('new')}
              >
                <span className="material-symbols-outlined me-2">person_add</span>
                Bệnh nhân mới
              </button>
            </div>
          </div>

          {mode === 'existing' && !selectedPatient ? (
            <div className="reception-card__body">
              <h2 className="h5 fw-bold">Tìm kiếm bệnh nhân</h2>
              <p className="text-secondary">
                Nhập họ tên hoặc số điện thoại để tra cứu hồ sơ.
              </p>
              <div className="input-group mb-4">
                <span className="input-group-text">
                  <span className="material-symbols-outlined">search</span>
                </span>
                <input
                  className="form-control"
                  aria-label="Tìm bệnh nhân cũ"
                  placeholder="Nhập họ tên hoặc số điện thoại..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleSearch();
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={isSearching}
                  onClick={() => void handleSearch()}
                >
                  {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
                </button>
              </div>

              {patients.length > 0 ? (
                <div className="d-grid gap-2">
                  {patients.map((patient) => (
                    <div className="border rounded-3 p-3" key={patient.id}>
                      <div className="d-flex align-items-center gap-3">
                        <span className="reception-person__avatar">
                          {patient.fullName
                            .split(/\s+/)
                            .slice(-2)
                            .map((part) => part[0])
                            .join('')
                            .toUpperCase()}
                        </span>
                        <div className="flex-grow-1">
                          <strong className="d-block">{patient.fullName}</strong>
                          <small className="text-secondary">
                            {patient.code} · {patient.phoneNumber}
                          </small>
                          {patient.allergies.length > 0 ? (
                            <small className="reception-allergy-summary">
                              <span className="material-symbols-outlined">warning</span>
                              Dị ứng: {patient.allergies.map((allergy) => allergy.agent).join(', ')}
                            </small>
                          ) : (
                            <small className="reception-allergy-summary reception-allergy-summary--empty">
                              <span className="material-symbols-outlined">medical_information</span>
                              Chưa ghi nhận dị ứng
                            </small>
                          )}
                        </div>
                        <button
                          className="btn btn-outline-primary"
                          type="button"
                          onClick={() => selectPatient(patient)}
                        >
                          Chọn hồ sơ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : search.trim() && !isSearching ? (
                <div className="reception-empty">
                  <span className="material-symbols-outlined fs-1">person_search</span>
                  <strong className="d-block mt-2">Không tìm thấy bệnh nhân</strong>
                  <div className="mt-1">Kiểm tra lại từ khóa hoặc tạo hồ sơ mới.</div>
                </div>
              ) : (
                <div className="reception-empty">
                  <span className="material-symbols-outlined fs-1">
                    manage_search
                  </span>
                  <strong className="d-block mt-2">
                    Nhập thông tin để bắt đầu tra cứu
                  </strong>
                  <div className="mt-1">
                    Nếu chưa có hồ sơ, chọn tab “Bệnh nhân mới”.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="reception-card__body">
                <div className="reception-form-stepper">
                  {STEPS.map(([icon, label], index) => {
                    const number = index + 1;
                    return (
                      <div
                        key={label}
                        className={`reception-form-step ${step === number
                            ? 'reception-form-step--active'
                            : step > number
                              ? 'reception-form-step--done'
                              : ''
                          }`}
                      >
                        <span className="material-symbols-outlined">{icon}</span>
                        {number}. {label}
                      </div>
                    );
                  })}
                </div>

                {step === 1 && (
                  <div>
                    <h2 className="h5 fw-bold">Hồ sơ bệnh nhân mới</h2>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="new-patient-name">
                          Họ và tên <span className="reception-required-mark" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="new-patient-name"
                          className="form-control"
                          value={form.fullName}
                          onChange={(event) =>
                            updateField('fullName', event.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="new-patient-phone">
                          Số điện thoại <span className="reception-required-mark" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="new-patient-phone"
                          className="form-control"
                          inputMode="tel"
                          placeholder="09xx xxx xxx"
                          value={form.phoneNumber}
                          onChange={(event) =>
                            updateField('phoneNumber', event.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label" htmlFor="new-patient-birth">
                          Ngày sinh <span className="reception-required-mark" aria-hidden="true">*</span>
                        </label>
                        <BirthDateField value={form.dateOfBirth} onChange={(value) => updateField('dateOfBirth', value)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label" htmlFor="new-patient-gender">
                          Giới tính <span className="reception-required-mark" aria-hidden="true">*</span>
                        </label>
                        <select
                          id="new-patient-gender"
                          className="form-select"
                          value={form.gender}
                          onChange={(event) =>
                            updateField('gender', event.target.value)
                          }
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="NAM">Nam</option>
                          <option value="NU">Nữ</option>
                          <option value="KHAC">Khác</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label
                          className="form-label"
                          htmlFor="new-patient-identity"
                        >
                          Số CCCD
                        </label>
                        <input
                          id="new-patient-identity"
                          className="form-control"
                          value={form.identityNumber}
                          onChange={(event) =>
                            updateField('identityNumber', event.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="new-patient-email">
                          Email
                        </label>
                        <input
                          id="new-patient-email"
                          className="form-control"
                          type="email"
                          value={form.email}
                          onChange={(event) =>
                            updateField('email', event.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label
                          className="form-label"
                          htmlFor="new-patient-insurance"
                        >
                          Mã thẻ BHYT
                        </label>
                        <input
                          id="new-patient-insurance"
                          className="form-control"
                          value={form.healthInsuranceNumber}
                          onChange={(event) =>
                            updateField(
                              'healthInsuranceNumber',
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="col-12">
                        <label
                          className="form-label"
                          htmlFor="new-patient-address"
                        >
                          Địa chỉ thường trú
                        </label>
                        <input
                          id="new-patient-address"
                          className="form-control"
                          value={form.address}
                          onChange={(event) =>
                            updateField('address', event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12">
                        <section className="reception-allergy-panel" aria-labelledby="patient-allergy-title">
                          <div className="d-flex align-items-start gap-2">
                            <span className="material-symbols-outlined text-danger">health_and_safety</span>
                            <div>
                              <h3 id="patient-allergy-title" className="h6 fw-bold mb-1">Dị ứng đã biết</h3>
                              <p className="text-secondary small mb-0">
                                Hỏi bệnh nhân hoặc người nhà. Chưa có thông tin không đồng nghĩa với không dị ứng.
                              </p>
                            </div>
                          </div>
                          <div className="reception-allergy-options" role="radiogroup" aria-label="Tình trạng dị ứng">
                            {([
                              ['CHUA_GHI_NHAN', 'Chưa ghi nhận', 'Bệnh nhân chưa từng ghi nhận dị ứng'],
                              ['CO_DI_UNG', 'Có dị ứng', 'Ghi tác nhân và phản ứng để cảnh báo khi kê đơn'],
                              ['CHUA_XAC_DINH', 'Chưa xác định', 'Không đủ thông tin để kết luận'],
                            ] as const).map(([value, title, helper]) => (
                              <label
                                className={`reception-allergy-option ${allergyDisclosure === value ? 'reception-allergy-option--selected' : ''}`}
                                key={value}
                              >
                                <input
                                  checked={allergyDisclosure === value}
                                  name="allergy-disclosure"
                                  onChange={() => {
                                    setAllergyDisclosure(value);
                                    if (value !== 'CO_DI_UNG') setAllergies([]);
                                    if (value === 'CO_DI_UNG' && allergies.length === 0) setAllergies([{ ...EMPTY_ALLERGY }]);
                                  }}
                                  type="radio"
                                  value={value}
                                />
                                <span><strong>{title}</strong><small>{helper}</small></span>
                              </label>
                            ))}
                          </div>
                          {allergyDisclosure === 'CO_DI_UNG' && (
                            <div className="d-grid gap-2 mt-3">
                              {allergies.map((allergy, index) => (
                                <div className="row g-2 align-items-end" key={index}>
                                  <div className="col-md-4">
                                    <label className="form-label small">Tác nhân dị ứng <span className="reception-required-mark">*</span></label>
                                    <input
                                      className="form-control"
                                      placeholder="Ví dụ: Amoxicillin"
                                      value={allergy.agent}
                                      onChange={(event) => setAllergies((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, agent: event.target.value } : item))}
                                    />
                                  </div>
                                  <div className="col-md-4">
                                    <label className="form-label small">Phản ứng đã gặp</label>
                                    <input
                                      className="form-control"
                                      placeholder="Ví dụ: nổi mề đay"
                                      value={allergy.reaction}
                                      onChange={(event) => setAllergies((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, reaction: event.target.value } : item))}
                                    />
                                  </div>
                                  <div className="col-md-3">
                                    <label className="form-label small">Mức độ</label>
                                    <select
                                      className="form-select"
                                      value={allergy.severity}
                                      onChange={(event) => setAllergies((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, severity: event.target.value as PatientAllergy['severity'] } : item))}
                                    >
                                      {Object.entries(ALLERGY_SEVERITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                  </div>
                                  <div className="col-md-1">
                                    <button className="btn btn-outline-danger w-100" disabled={allergies.length === 1} type="button" aria-label="Xóa dị ứng" onClick={() => setAllergies((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                                      <span className="material-symbols-outlined">delete</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div>
                                <button className="btn btn-outline-primary btn-sm" disabled={allergies.length >= 10} type="button" onClick={() => setAllergies((current) => [...current, { ...EMPTY_ALLERGY }])}>
                                  <span className="material-symbols-outlined me-1">add</span>Thêm dị ứng
                                </button>
                              </div>
                            </div>
                          )}
                        </section>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    {selectedPatient && (
                      <div className={`reception-known-allergies ${selectedPatient.allergies.length ? 'reception-known-allergies--has-data' : ''}`}>
                        <span className="material-symbols-outlined">health_and_safety</span>
                        <div>
                          <span className="reception-known-allergies__eyebrow">Thông tin an toàn</span>
                          <strong>
                            {selectedPatient.allergies.length
                              ? `Dị ứng đã ghi nhận của ${selectedPatient.fullName}`
                              : `Chưa ghi nhận dị ứng của ${selectedPatient.fullName}`}
                          </strong>
                          {selectedPatient.allergies.length ? (
                            <div className="reception-known-allergies__items">
                              {selectedPatient.allergies.map((allergy) => {
                                const reaction = formatAllergyReaction(allergy.agent, allergy.reaction);
                                return (
                                  <div className="reception-known-allergies__item" key={allergy.id}>
                                    <strong>Dị ứng với {allergy.agent}</strong>
                                    <span>{reaction}</span>
                                    <small>{ALLERGY_SEVERITY_LABELS[allergy.severity]}</small>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p>Hỏi lại bệnh nhân trước khi bác sĩ kê đơn.</p>
                          )}
                        </div>
                        <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => setStep(1)}>
                          Cập nhật dị ứng
                        </button>
                      </div>
                    )}
                    <h2 className="h5 fw-bold">Chuyên khoa và bác sĩ</h2>
                    <p className="text-secondary">
                      Chọn nơi khám, bác sĩ phụ trách và ghi nhận lý do đến khám.
                    </p>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="new-specialty">
                          Chuyên khoa <span className="reception-required-mark" aria-hidden="true">*</span>
                        </label>
                        <select
                          id="new-specialty"
                          className="form-select"
                          value={form.specialty}
                          onChange={(event) => {
                            updateField('specialty', event.target.value);
                            updateField('doctor', '');
                          }}
                        >
                          <option value="">Chọn chuyên khoa</option>
                          {specialties.map((specialty) => (
                            <option key={specialty.id} value={specialty.id}>
                              {specialty.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="new-doctor">
                          Bác sĩ phụ trách <span className="reception-required-mark" aria-hidden="true">*</span>
                        </label>
                        <select
                          id="new-doctor"
                          className="form-select"
                          value={form.doctor}
                          onChange={(event) =>
                            updateField('doctor', event.target.value)
                          }
                        >
                          <option value="">Chọn bác sĩ</option>
                          {availableDoctors.map((doctor) => (
                            <option key={doctor.id} value={doctor.id}>
                              {doctor.fullName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label" htmlFor="new-reason">
                          Lý do khám <span className="reception-required-mark" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="new-reason"
                          className="form-control"
                          value={form.reason}
                          onChange={(event) =>
                            updateField('reason', event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label" htmlFor="new-symptoms">
                          Triệu chứng ban đầu
                        </label>
                        <textarea
                          id="new-symptoms"
                          className="form-control"
                          rows={4}
                          value={form.symptoms}
                          onChange={(event) =>
                            updateField('symptoms', event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h2 className="h5 fw-bold">Đối tượng ưu tiên</h2>
                    <p className="text-secondary">
                      Chọn đúng nhóm để lễ tân điều phối thứ tự phù hợp.
                    </p>
                    <div className="reception-choice-grid">
                      {PRIORITIES.map((priority) => (
                        <button
                          key={priority.code}
                          type="button"
                          className={`reception-choice ${form.priority === priority.code
                              ? 'reception-choice--selected'
                              : ''
                            } ${priority.code === 'KHAN_CAP' ? 'reception-choice--emergency' : ''}`}
                          onClick={() =>
                            updateField('priority', priority.code)
                          }
                        >
                          <span className="material-symbols-outlined">
                            {priority.icon}
                          </span>
                          <strong>{priority.title}</strong>
                          <small>{priority.helper}</small>
                        </button>
                      ))}
                    </div>
                    <label className="form-label mt-3" htmlFor="new-note">
                      Ghi chú cho bác sĩ
                    </label>
                    <textarea
                      id="new-note"
                      className="form-control"
                      rows={4}
                      value={form.note}
                      onChange={(event) =>
                        updateField('note', event.target.value)
                      }
                    />
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <h2 className="h5 fw-bold">Xác nhận thông tin tiếp đón</h2>
                    <p className="text-secondary">
                      Kiểm tra lại trước khi tạo hồ sơ và số thứ tự.
                    </p>
                    <div className="border rounded-3 p-3">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <small className="text-secondary">Bệnh nhân</small>
                          <strong className="d-block">
                            {form.fullName || 'Chưa nhập họ tên'}
                          </strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-secondary">Số điện thoại</small>
                          <strong className="d-block">
                            {form.phoneNumber || 'Chưa nhập'}
                          </strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-secondary">Chuyên khoa</small>
                          <strong className="d-block">
                            {specialtyLabel}
                          </strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-secondary">Bác sĩ</small>
                          <strong className="d-block">
                            {doctorLabel}
                          </strong>
                        </div>
                        <div className="col-12">
                          <small className="text-secondary">Lý do khám</small>
                          <strong className="d-block">
                            {form.reason || 'Chưa nhập'}
                          </strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-secondary">Mức ưu tiên</small>
                          <strong className="d-block">
                            {PRIORITY_LABELS[form.priority]}
                          </strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-secondary">
                            Số thứ tự
                          </small>
                          <strong className="d-block text-primary">
                            {completedQueueNumber
                              ? `#${completedQueueNumber}`
                              : 'Được cấp sau khi xác nhận'}
                          </strong>
                        </div>
                      </div>
                    </div>
                    {isCompleted ? (
                      <div className="reception-complete mt-3">
                        <span className="material-symbols-outlined">
                          check_circle
                        </span>
                        <div>
                          <strong>Đã xác nhận và cấp phiếu tiếp đón</strong>
                          <p className="mb-0">
                            Phiếu đã được lưu và chuyển đến hàng đợi của bác sĩ.
                          </p>
                        </div>
                      </div>
                    ) : isConfirmed ? (
                      <div className="alert alert-primary mt-3 mb-0">
                        Thông tin đã được xác nhận. Bạn có thể cấp số thứ tự và
                        tạo phiếu tiếp đón.
                      </div>
                    ) : (
                      <div className="alert alert-warning mt-3 mb-0">
                        Kiểm tra thông tin và nhấn “Xác nhận” trước khi cấp phiếu.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-between border-top p-3 bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={step === 1}
                  onClick={() => setStep((current) => current - 1)}
                >
                  Quay lại
                </button>
                {step < 4 ? (
                  <button type="submit" className="btn btn-primary">
                    Tiếp theo
                    <span className="material-symbols-outlined ms-2">
                      arrow_forward
                    </span>
                  </button>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      disabled={isConfirmed}
                      onClick={confirmReception}
                    >
                      <span className="material-symbols-outlined me-2">
                        {isConfirmed ? 'check_circle' : 'fact_check'}
                      </span>
                      {isConfirmed ? 'Đã xác nhận' : 'Xác nhận'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!isConfirmed || isCompleted || isSubmitting}
                      onClick={() => void issueTicket()}
                    >
                      <span className="material-symbols-outlined me-2">
                        {isCompleted ? 'task_alt' : 'confirmation_number'}
                      </span>
                      {isSubmitting
                        ? 'Đang cấp phiếu...'
                        : isCompleted
                          ? 'Đã cấp phiếu'
                          : 'Cấp phiếu'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-dark"
                      disabled={!isCompleted}
                      onClick={openPrintTicket}
                    >
                      <span className="material-symbols-outlined me-2">print</span>
                      In phiếu
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}
        </section>

        <aside className="reception-queue">
          <div className="reception-queue__header">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <h2>
                <span className="material-symbols-outlined">groups</span>
                Hàng đợi tiếp đón
              </h2>
              <span className="reception-queue__count">
                {queue.length} đang chờ
              </span>
            </div>
            <div className="reception-queue__filters">
              <button
                type="button"
                className={queueFilter === 'all' ? 'active' : ''}
                onClick={() => setQueueFilter('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={queueFilter === 'emergency' ? 'active' : ''}
                onClick={() => setQueueFilter('emergency')}
              >
                Khẩn cấp
              </button>
            </div>
          </div>
          <div className="reception-queue__list">
            {isLoadingQueue ? (
              <div className="reception-empty">Đang tải hàng đợi...</div>
            ) : queueError ? (
              <div className="reception-empty text-danger">{queueError}</div>
            ) : (
              filteredQueue.map((item) => {
                const isEmergency = item.priority === 'KHAN_CAP';
                const isPriority = item.priority !== 'THONG_THUONG';
                const category = isEmergency
                  ? 'Khẩn cấp'
                  : isPriority
                    ? 'Ưu tiên'
                    : 'Thông thường';
                const tone = isEmergency
                  ? 'red'
                  : isPriority
                    ? 'amber'
                    : 'blue';
                const ticketStatusLabel =
                  item.ticket.status === 'DANG_GOI'
                    ? 'Bác sĩ đang gọi'
                    : item.ticket.status === 'BO_QUA'
                      ? 'Tạm bỏ qua'
                      : 'Đã cấp phiếu';
                const ticketStatusClass =
                  item.ticket.status === 'BO_QUA'
                    ? 'text-bg-warning'
                    : item.ticket.status === 'DANG_GOI'
                      ? 'text-bg-primary'
                      : 'text-bg-success';

                return (
                  <article
                    key={item.id}
                    className={`reception-queue-item reception-queue-item--${tone}`}
                  >
                    <div className="reception-queue-item__top">
                      <span>
                        {category} ·{' '}
                        {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <strong>#{item.ticket.queueNumber}</strong>
                    </div>
                    <h3>{item.patient.fullName}</h3>
                    <div className="reception-queue-item__meta">
                      <span>
                        <span className="material-symbols-outlined">call</span>
                        {item.patient.phoneNumber}
                      </span>
                      <span>
                        {item.isNewPatient ? 'Bệnh nhân mới' : 'Bệnh nhân cũ'} ·{' '}
                        {item.specialty.name}
                      </span>
                    </div>
                    <span className={`badge ${ticketStatusClass} align-self-start`}>
                      {ticketStatusLabel}
                    </span>
                  </article>
                );
              })
            )}
            {!isLoadingQueue && !queueError && !filteredQueue.length && (
              <div className="reception-empty">Không có bệnh nhân phù hợp.</div>
            )}
          </div>
        </aside>
      </div>

    </div>
  );
}
