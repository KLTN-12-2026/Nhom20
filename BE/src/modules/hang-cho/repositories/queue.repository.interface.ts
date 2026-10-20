import type { Prisma, TrangThaiHangCho } from '@prisma/client';

export const queueInclude = {
  chuyenKhoa: true,
  luotKham: {
    include: {
      benhNhan: true,
      bacSi: true,
      lichHen: true,
    },
  },
} satisfies Prisma.PhieuHangChoInclude;

export type QueueTicketWithRelations = Prisma.PhieuHangChoGetPayload<{
  include: typeof queueInclude;
}>;

export interface QueueRepository {
  findDoctorIdByUserId(userId: number): Promise<number | null>;
  findDoctorQueue(
    doctorId: number,
    date: Date,
  ): Promise<QueueTicketWithRelations[]>;
  findPublicCalled(date: Date): Promise<QueueTicketWithRelations[]>;
  findById(id: number): Promise<QueueTicketWithRelations | null>;
  updateStatus(
    id: number,
    status: TrangThaiHangCho,
    userId: number,
  ): Promise<QueueTicketWithRelations>;
}

export const QUEUE_REPOSITORY = Symbol('QUEUE_REPOSITORY');
