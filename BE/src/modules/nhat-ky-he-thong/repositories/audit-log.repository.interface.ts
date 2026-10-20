import { NhatKyHeThong, PhanHeNhatKyHeThong, Prisma } from '@prisma/client';

export interface AuditActor {
  id: number;
  hoTen: string;
  email: string | null;
  nguoiDungVaiTro: Array<{
    vaiTro: {
      tenVaiTro: string;
    };
  }>;
}

export interface AuditLogFilters {
  search?: string;
  module?: PhanHeNhatKyHeThong;
  from?: Date;
  to?: Date;
  skip: number;
  take: number;
}

export interface AuditLogRepository {
  findAll(
    filters: AuditLogFilters,
  ): Promise<{ items: (NhatKyHeThong & { nguoiDung: { anhDaiDienUrl: string | null } | null })[]; total: number }>;
  findActor(userId: number): Promise<AuditActor | null>;
  create(
    data: Prisma.NhatKyHeThongUncheckedCreateInput,
  ): Promise<NhatKyHeThong>;
}

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');
