import type { Prisma, TrangThaiChung } from '@prisma/client';

export type DoctorWithRelations = Prisma.BacSiGetPayload<{
  include: {
    nguoiDung: {
      select: {
        email: true;
        anhDaiDienUrl: true;
        anhDaiDienPublicId: true;
        benhNhan: { select: { id: true } };
        _count: { select: {
          phieuHangChoDaGoi: true; phieuHangChoXacNhan: true; donThuocDaCap: true;
          donThuocDaTuChoi: true; giaoDichKho: true; hoaDonDaTao: true;
          thanhToanDaThu: true; lichHenDaXacNhan: true; duLieuYTeDaGhi: true;
          tienSuBenhDaGhi: true; canhBaoDaXuLy: true; phanCongCa: true;
          caDaSapXep: true; caDaDuyet: true; donViDangQuanLy: true;
          caDaBanGiao: true; caDaNhanBanGiao: true; goiYThuocDaDuyet: true; phienChat: true;
        } };
      };
    };
    chuyenKhoa: {
      select: { id: true; maChuyenKhoa: true; tenChuyenKhoa: true };
    };
    danhGia: { select: { soSao: true } };
    _count: {
      select: {
        luotKham: true;
        lichHen: true;
        danhGia: true;
      };
    };
  };
}>;

export interface CreateDoctorData {
  code: string;
  fullName: string;
  specialtyId: number;
  phoneNumber: string | null;
  email: string;
  passwordHash: string;
  academicDegree: string | null;
  experienceYears: number;
  description: string | null;
  status: TrangThaiChung;
}

export interface UpdateDoctorData {
  code?: string;
  fullName?: string;
  specialtyId?: number;
  phoneNumber?: string | null;
  email?: string;
  passwordHash?: string;
  academicDegree?: string | null;
  experienceYears?: number;
  description?: string | null;
  status?: TrangThaiChung;
}

export interface DoctorRepository {
  findAll(
    search?: string,
    status?: TrangThaiChung,
    specialtyId?: number,
  ): Promise<DoctorWithRelations[]>;
  findAvailable(date: Date, specialtyId?: number): Promise<DoctorWithRelations[]>;
  findById(id: number): Promise<DoctorWithRelations | null>;
  findConflict(
    code: string,
    email: string,
    phoneNumber?: string | null,
    excludeDoctorId?: number,
  ): Promise<{ id: number } | null>;
  specialtyExists(id: number): Promise<boolean>;
  create(data: CreateDoctorData): Promise<DoctorWithRelations>;
  update(id: number, data: UpdateDoctorData): Promise<DoctorWithRelations>;
  delete(id: number): Promise<void>;
}

export const DOCTOR_REPOSITORY = Symbol('DOCTOR_REPOSITORY');
