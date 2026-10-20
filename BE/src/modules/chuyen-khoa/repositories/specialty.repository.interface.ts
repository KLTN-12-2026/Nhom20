import { ChuyenKhoa, Prisma, TrangThaiChung } from '@prisma/client';

export type SpecialtyWithDoctorCount = ChuyenKhoa & {
  _count: { bacSi: number };
};

export interface SpecialtyRepository {
  findAll(
    search?: string,
    status?: TrangThaiChung,
  ): Promise<SpecialtyWithDoctorCount[]>;
  findById(id: number): Promise<SpecialtyWithDoctorCount | null>;
  findConflict(
    code: string,
    name: string,
    excludeId?: number,
  ): Promise<ChuyenKhoa | null>;
  create(data: Prisma.ChuyenKhoaCreateInput): Promise<SpecialtyWithDoctorCount>;
  update(
    id: number,
    data: Prisma.ChuyenKhoaUpdateInput,
    currentName?: string,
    synchronizeExaminationService?: boolean,
  ): Promise<SpecialtyWithDoctorCount>;
  delete(id: number): Promise<ChuyenKhoa>;
}

export const SPECIALTY_REPOSITORY = Symbol('SPECIALTY_REPOSITORY');
