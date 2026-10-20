export type AppointmentStatus =
  | 'CHO_XAC_NHAN'
  | 'DA_XAC_NHAN'
  | 'DA_TU_CHOI'
  | 'DA_HUY'
  | 'DA_CHECK_IN'
  | 'KHONG_DEN';

export type AppointmentSource =
  | 'KHACH_VANG_LAI'
  | 'BENH_NHAN'
  | 'NHAN_VIEN'
  | 'AI_HO_TRO';

export const APPOINTMENT_SOURCE_LABELS: Record<AppointmentSource, string> = {
  KHACH_VANG_LAI: 'Đặt lịch trên web',
  BENH_NHAN: 'Đặt lịch trên web',
  NHAN_VIEN: 'Nhân viên tạo',
  AI_HO_TRO: 'Chatbox tạo',
};

export interface Appointment {
  id: number;
  code: string;
  patient: {
    id: number;
    code: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    dateOfBirth: string | null;
    gender: 'NAM' | 'NU' | 'KHAC' | null;
  };
  specialty: { id: number; code: string; name: string };
  doctor: { id: number; fullName: string; avatarUrl: string | null } | null;
  room: { id: number; name: string } | null;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  source: AppointmentSource;
  reason: string | null;
  note: string | null;
  status: AppointmentStatus;
  rejectionOrCancellationReason: string | null;
  ticket: {
    queueNumber: string;
    issuedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  checkedIn: number;
}

export interface GuestAppointmentPayload {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: 'NAM' | 'NU' | 'KHAC';
  email?: string;
  specialtyId: number;
  doctorId?: number;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  note?: string;
}

export interface AppointmentUpdatePayload {
  specialtyId?: number;
  doctorId?: number | null;
  appointmentDate?: string;
  appointmentTime?: string;
  reason?: string;
  note?: string;
  status?: AppointmentStatus;
  rejectionOrCancellationReason?: string;
}

export interface AppointmentQuery {
  search?: string;
  specialtyId?: number;
  doctorId?: number;
  date?: string;
  status?: AppointmentStatus;
  page?: number;
  limit?: number;
}
