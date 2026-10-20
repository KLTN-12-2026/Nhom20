export interface ReceptionPatient {
  id: number;
  code: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: 'NAM' | 'NU' | 'KHAC' | null;
  address: string | null;
  identityNumber: string | null;
  healthInsuranceNumber: string | null;
  allergies: PatientAllergy[];
}

export interface PatientAllergy {
  id: number;
  agent: string;
  reaction: string | null;
  severity: 'CHUA_XAC_DINH' | 'NHE' | 'TRUNG_BINH' | 'NGHIEM_TRONG';
  confirmationStatus: string;
}

export interface ReceptionRecord {
  id: number;
  code: string;
  patient: Pick<
    ReceptionPatient,
    'id' | 'code' | 'fullName' | 'phoneNumber'
  >;
  specialty: { id: number; name: string };
  doctor: { id: number; fullName: string } | null;
  room: { id: number; name: string } | null;
  reason: string | null;
  priority:
    | 'THONG_THUONG'
    | 'TRE_EM'
    | 'NGUOI_CAO_TUOI'
    | 'MANG_THAI'
    | 'KHAN_CAP';
  source: 'KHAM_TRUC_TIEP';
  isNewPatient: boolean;
  ticket: {
    id: number;
    queueNumber: string;
    ordinalNumber: number;
    status: string;
    issuedAt: string;
  };
  createdAt: string;
}

export interface CreateReceptionPayload {
  patientId?: number;
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'NAM' | 'NU' | 'KHAC';
  email?: string;
  identityNumber?: string;
  healthInsuranceNumber?: string;
  address?: string;
  allergies?: Array<{
    agent: string;
    reaction?: string;
    severity?: PatientAllergy['severity'];
  }>;
  specialtyId: number;
  doctorId: number;
  reason: string;
  symptoms?: string;
  priority?: ReceptionRecord['priority'];
  note?: string;
}

export interface FollowUpReminder {
  recordId: number;
  date: string;
  patient: Pick<ReceptionPatient, 'id' | 'code' | 'fullName' | 'phoneNumber'>;
  doctor: { id: number; fullName: string };
  specialty: { id: number; name: string };
  conclusion: string | null;
}

export interface FollowUpReminderGroups {
  today: FollowUpReminder[];
  tomorrow: FollowUpReminder[];
}

export interface ReceptionDashboard {
  range: { from: string; to: string };
  appointmentsByDay: Array<{ date: string; total: number }>;
  appointmentStatuses: Array<{ status: string; total: number }>;
  queueStatuses: Array<{ status: string; total: number }>;
  queueBySpecialty: Array<{
    specialtyId: number;
    specialtyName: string;
    total: number;
  }>;
  upcomingAppointments: Array<{
    id: number;
    code: string;
    patient: { fullName: string; phoneNumber: string };
    specialty: string;
    doctor: string | null;
    time: string;
    date: string;
    status: string;
  }>;
}
