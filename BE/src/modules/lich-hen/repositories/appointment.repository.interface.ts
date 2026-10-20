import type {
  GioiTinh,
  NguonDatLich,
  Prisma,
  TrangThaiLichHen,
} from '@prisma/client';

export const appointmentInclude = {
  benhNhan: true,
  chuyenKhoa: true,
  bacSi: { include: { nguoiDung: true } },
  luotKham: { include: { phieuHangCho: true } },
} satisfies Prisma.LichHenInclude;

export type AppointmentWithRelations = Prisma.LichHenGetPayload<{
  include: typeof appointmentInclude;
}>;

export interface AppointmentFilters {
  search?: string;
  specialtyId?: number;
  doctorId?: number;
  date?: Date;
  status?: TrangThaiLichHen;
  skip: number;
  take: number;
}

export interface GuestAppointmentData {
  patient: {
    code: string;
    fullName: string;
    phoneNumber: string;
    dateOfBirth: Date;
    gender: GioiTinh;
    email: string | null;
  };
  appointment: {
    code: string;
    specialtyId: number;
    doctorId: number | null;
    date: Date;
    startTime: Date;
    endTime: Date;
    source: NguonDatLich;
    reason: string;
    note: string | null;
  };
}

export interface ExistingPatientAppointmentData {
  patientId: number;
  appointment: GuestAppointmentData['appointment'];
}

export interface PatientForAppointment {
  id: number;
  fullName: string;
  phoneNumber: string;
}

export interface AppointmentRepository {
  getTodayStats(
    today: Date,
    doctorId?: number,
  ): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
  }>;
  findDoctorIdByUserId(userId: number): Promise<number | null>;
  findAll(
    filters: AppointmentFilters,
  ): Promise<{ items: AppointmentWithRelations[]; total: number }>;
  findById(id: number): Promise<AppointmentWithRelations | null>;
  specialtyExists(id: number): Promise<boolean>;
  doctorMatchesSpecialty(
    doctorId: number,
    specialtyId: number,
  ): Promise<boolean>;
  findDuplicate(
    phoneNumber: string,
    date: Date,
    startTime: Date,
  ): Promise<{ id: number } | null>;
  findPatientForAppointment(
    patientId: number,
  ): Promise<PatientForAppointment | null>;
  findPatientByUserId(userId: number): Promise<PatientForAppointment | null>;
  createGuest(data: GuestAppointmentData): Promise<AppointmentWithRelations>;
  createForExistingPatient(
    data: ExistingPatientAppointmentData,
  ): Promise<AppointmentWithRelations>;
  update(
    id: number,
    data: {
      specialtyId?: number;
      doctorId?: number | null;
      date?: Date;
      startTime?: Date;
      endTime?: Date;
      reason?: string;
      note?: string | null;
      status?: TrangThaiLichHen;
      confirmerId?: number | null;
      confirmedAt?: Date | null;
      rejectionOrCancellationReason?: string | null;
    },
  ): Promise<AppointmentWithRelations>;
  delete(id: number): Promise<void>;
  checkIn(data: {
    appointmentId: number;
    patientId: number;
    specialtyId: number;
    doctorId: number;
    visitCode: string;
    queueCodePrefix: string;
    queueDate: Date;
    appointmentAt: Date;
    reason: string;
    initialSymptoms: string | null;
    currentUserId: number;
  }): Promise<AppointmentWithRelations>;
}

export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');
