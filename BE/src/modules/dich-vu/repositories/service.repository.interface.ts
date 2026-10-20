import { DichVu, Prisma, TrangThaiChung } from '@prisma/client';

export type ServiceWithSpecialty = Prisma.DichVuGetPayload<{
  include: { chuyenKhoa: true };
}>;

export interface ServiceRepository {
  findAll(
    search?: string,
    status?: TrangThaiChung,
    specialtyId?: number,
  ): Promise<ServiceWithSpecialty[]>;
  findById(id: number): Promise<ServiceWithSpecialty | null>;
  findConflict(
    code: string,
    name: string,
    excludeId?: number,
  ): Promise<DichVu | null>;
  create(data: Prisma.DichVuCreateInput): Promise<ServiceWithSpecialty>;
  update(
    id: number,
    data: Prisma.DichVuUpdateInput,
    synchronizeExaminationFee?: boolean,
  ): Promise<ServiceWithSpecialty>;
  delete(id: number): Promise<DichVu>;
}

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');
