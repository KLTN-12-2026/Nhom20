import type { Prisma, TrangThaiHoSoKham } from '@prisma/client';

export const examinationInclude = {
  chiTietChuyenKhoa: true,
  // Bệnh nhân và bác sĩ là nguồn dữ liệu của lượt khám, không lặp lại ở hồ sơ.
  luotKham: {
    include: {
      benhNhan: {
        include: {
          diUng: {
            select: {
              id: true,
              tacNhanDiUng: true,
              phanUng: true,
              mucDo: true,
              trangThaiXacNhan: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
          },
        },
      },
      bacSi: { include: { chuyenKhoa: true } },
      phieuHangCho: true,
      lichHen: true,
    },
  },
  donThuoc: {
    include: { chiTiet: { include: { thuoc: true } } },
  },
} satisfies Prisma.HoSoKhamInclude;

export type ExaminationWithRelations = Prisma.HoSoKhamGetPayload<{
  include: typeof examinationInclude;
}>;

export const visitForExaminationInclude = {
  chuyenKhoa: {
    select: { id: true, maChuyenKhoa: true, tenChuyenKhoa: true },
  },
  benhNhan: {
    include: {
      diUng: {
        select: {
          id: true,
          tacNhanDiUng: true,
          phanUng: true,
          mucDo: true,
          trangThaiXacNhan: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  },
  bacSi: true,
  phieuHangCho: true,
  hoSoKham: { include: examinationInclude },
} satisfies Prisma.LuotKhamInclude;

export type VisitForExamination = Prisma.LuotKhamGetPayload<{
  include: typeof visitForExaminationInclude;
}>;

export interface ExaminationSaveData {
  visitId: number;
  status: TrangThaiHoSoKham;
  symptoms?: string;
  diagnosis?: string;
  icd10Code?: string;
  vitals?: Prisma.InputJsonValue;
  specialtyContent?: Prisma.InputJsonValue;
  specialtyId?: number;
  specialtyData?: Prisma.InputJsonValue;
  conclusion?: string;
  doctorNotes?: string;
  followUpDate?: Date;
  prescription?: Array<{
    medicineId: number;
    quantity: number;
    dosage: string;
    frequency: string;
    days: number;
    instructions?: string;
    unitPrice: Prisma.Decimal;
  }>;
}

export interface ExaminationRepository {
  findDoctorId(userId: number): Promise<number | null>;
  findActiveVisitByDoctorId(
    doctorId: number,
  ): Promise<VisitForExamination | null>;
  findVisitByAppointmentId(
    appointmentId: number,
  ): Promise<VisitForExamination | null>;
  findVisitById(visitId: number): Promise<VisitForExamination | null>;
  findMedicines(ids: number[]): Promise<
    Array<{
      id: number;
      tenThuoc: string;
      giaBan: Prisma.Decimal;
      trangThai: string;
    }>
  >;
  save(data: ExaminationSaveData): Promise<ExaminationWithRelations>;
  markComplete(
    recordId: number,
    visitId: number,
  ): Promise<ExaminationWithRelations>;
  findHistory(input: {
    doctorId: number;
    search?: string;
    from?: Date;
    to?: Date;
    skip: number;
    take: number;
  }): Promise<{ items: ExaminationWithRelations[]; total: number }>;
  findById(id: number): Promise<ExaminationWithRelations | null>;
}

export const EXAMINATION_REPOSITORY = Symbol('EXAMINATION_REPOSITORY');
