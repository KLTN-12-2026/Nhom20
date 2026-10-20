import type { Prisma, TrangThaiDonThuoc } from '@prisma/client';

export const dispensingInclude = {
  nguoiCapThuoc: true,
  nguoiTuChoi: true,
  // Đơn thuốc lấy bệnh nhân/bác sĩ qua hồ sơ và lượt khám để không giữ ID trùng.
  hoSoKham: {
    include: {
      luotKham: {
        include: { benhNhan: true, bacSi: { include: { chuyenKhoa: true } } },
      },
    },
  },
  chiTiet: {
    include: {
      thuoc: { include: { loThuoc: true } },
      chiTietCapThuoc: { include: { loThuoc: true } },
    },
  },
} satisfies Prisma.DonThuocInclude;

export type DispensingPrescription = Prisma.DonThuocGetPayload<{
  include: typeof dispensingInclude;
}>;

export interface DispenseAllocation {
  prescriptionItemId: number;
  medicineId: number;
  batchId: number;
  quantity: number;
}

export interface DispensingRepository {
  findById(id: number): Promise<DispensingPrescription | null>;
  findPending(input: {
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ items: DispensingPrescription[]; total: number }>;
  findProcessing(input: {
    pharmacistId: number;
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ items: DispensingPrescription[]; total: number }>;
  findHistory(input: {
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ items: DispensingPrescription[]; total: number }>;
  accept(id: number, pharmacistId: number): Promise<DispensingPrescription>;
  refuse(
    id: number,
    pharmacistId: number,
    reason: string,
  ): Promise<DispensingPrescription>;
  dispense(input: {
    id: number;
    pharmacistId: number;
    allocations: DispenseAllocation[];
    notes?: string;
  }): Promise<DispensingPrescription>;
  updateStatus(
    id: number,
    status: TrangThaiDonThuoc,
  ): Promise<DispensingPrescription>;
}

export const DISPENSING_REPOSITORY = Symbol('DISPENSING_REPOSITORY');
