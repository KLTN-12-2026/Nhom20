import type {
  GioiTinh,
  MucDoDiUng,
  MucDoUuTienTiepDon,
  Prisma,
  TrangThaiHangCho,
  TrangThaiLichHen,
} from '@prisma/client';

export const receptionInclude = {
  benhNhan: { include: { _count: { select: { luotKham: true } } } },
  chuyenKhoa: true,
  bacSi: true,
  luotKham: { include: { phieuHangCho: true } },
} satisfies Prisma.LichHenInclude;

export type ReceptionWithRelations = Prisma.LichHenGetPayload<{
  include: typeof receptionInclude;
}>;

export const receptionTicketInclude = {
  luotKham: {
    include: {
      benhNhan: true,
      chuyenKhoa: true,
      bacSi: true,
    },
  },
} satisfies Prisma.PhieuHangChoInclude;

export type ReceptionTicketWithRelations = Prisma.PhieuHangChoGetPayload<{
  include: typeof receptionTicketInclude;
}>;

export const followUpInclude = {
  luotKham: {
    select: {
      benhNhan: {
        select: { id: true, maBenhNhan: true, hoTen: true, soDienThoai: true },
      },
      bacSi: { select: { id: true, hoTen: true } },
      chuyenKhoa: {
        select: {
          id: true,
          tenChuyenKhoa: true,
        },
      },
    },
  },
} satisfies Prisma.HoSoKhamInclude;

export type FollowUpWithRelations = Prisma.HoSoKhamGetPayload<{
  include: typeof followUpInclude;
}>;

export interface CreateReceptionData {
  patientId?: number;
  patient?: {
    code: string;
    fullName: string;
    phoneNumber: string;
    dateOfBirth: Date;
    gender: GioiTinh;
    email: string | null;
    identityNumber: string | null;
    healthInsuranceNumber: string | null;
    address: string | null;
  };
  specialtyId: number;
  doctorId: number;
  confirmerId: number;
  date: Date;
  startTime: Date;
  endTime: Date;
  appointmentCode: string;
  visitCode: string;
  queuePrefix: string;
  reason: string;
  symptoms: string | null;
  priority: MucDoUuTienTiepDon;
  note: string | null;
  allergies: Array<{
    agent: string;
    reaction: string | null;
    severity: MucDoDiUng;
  }>;
}

export interface ReceptionDashboardData {
  appointmentsByDay: Array<{
    ngayHen: Date;
    _count: { _all: number };
  }>;
  appointmentStatuses: Array<{
    trangThai: TrangThaiLichHen;
    _count: { _all: number };
  }>;
  queueStatuses: Array<{
    trangThai: TrangThaiHangCho;
    _count: { _all: number };
  }>;
  queueBySpecialty: Array<{
    chuyenKhoaId: number;
    _count: { _all: number };
  }>;
  specialties: Array<{ id: number; tenChuyenKhoa: string }>;
  upcomingAppointments: ReceptionWithRelations[];
}

export interface ReceptionRepository {
  searchPatients(search: string): Promise<
    Array<{
      id: number;
      maBenhNhan: string;
      hoTen: string;
      soDienThoai: string;
      email: string | null;
      ngaySinh: Date | null;
      gioiTinh: GioiTinh | null;
      diaChi: string | null;
      soCanCuoc: string | null;
      maTheBaoHiemYTe: string | null;
      diUng: Array<{
        id: number;
        tacNhanDiUng: string;
        phanUng: string | null;
        mucDo: MucDoDiUng;
        trangThaiXacNhan: string;
      }>;
    }>
  >;
  searchAllPatients(search: string, specialtyIds?: number[]): Promise<
    Array<{
      id: number;
      maBenhNhan: string;
      hoTen: string;
      soDienThoai: string;
      email: string | null;
      ngaySinh: Date | null;
      gioiTinh: GioiTinh | null;
      diaChi: string | null;
      soCanCuoc: string | null;
      maTheBaoHiemYTe: string | null;
      diUng: Array<{
        id: number;
        tacNhanDiUng: string;
        phanUng: string | null;
        mucDo: MucDoDiUng;
        trangThaiXacNhan: string;
      }>;
    }>
  >;
  findPatientRecord(id: number, specialtyIds?: number[]): Promise<any>;
  findManagedSpecialtyIds(userId: number): Promise<number[]>;
  doctorMatchesSpecialty(
    doctorId: number,
    specialtyId: number,
  ): Promise<boolean>;
  create(data: CreateReceptionData): Promise<ReceptionWithRelations>;
  findTicketByQueueNumber(
    queueNumber: string,
  ): Promise<ReceptionTicketWithRelations | null>;
  findTodayQueue(date: Date): Promise<ReceptionWithRelations[]>;
  findFollowUps(from: Date, to: Date): Promise<FollowUpWithRelations[]>;
  getDashboardData(from: Date, to: Date): Promise<ReceptionDashboardData>;
  findSpecialtyName(specialtyId: number): Promise<string | null>;
}

export const RECEPTION_REPOSITORY = Symbol('RECEPTION_REPOSITORY');
