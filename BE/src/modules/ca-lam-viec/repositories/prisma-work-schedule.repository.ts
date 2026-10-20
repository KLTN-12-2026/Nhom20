import { Injectable } from '@nestjs/common';
import {
  ChucVuNhanVien,
  ChucVuQuanLyDonVi,
  NguonPhanCongCa,
  TrangThaiChung,
  TrangThaiPhanCongCa,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type { WorkScheduleRepository } from './work-schedule.repository.interface';

@Injectable()
export class PrismaWorkScheduleRepository implements WorkScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDoctorByUserId(userId: number) {
    return this.prisma.bacSi.findUnique({
      where: { nguoiDungId: userId },
      include: {
        nguoiDung: { select: { id: true, hoTen: true } },
        chuyenKhoa: { select: { id: true, tenChuyenKhoa: true } },
      },
    });
  }

  findDoctorById(doctorId: number) {
    return this.prisma.bacSi.findUnique({
      where: { id: doctorId },
      include: {
        nguoiDung: { select: { id: true, hoTen: true } },
        chuyenKhoa: { select: { id: true, tenChuyenKhoa: true } },
      },
    });
  }

  findManagerAccess(userId: number, date: Date) {
    return this.prisma.quanLyDonVi.findFirst({
      where: {
        nguoiDungId: userId,
        chucVu: ChucVuQuanLyDonVi.TRUONG_DON_VI,
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
        ngayBatDau: { lte: date },
        OR: [{ ngayKetThuc: null }, { ngayKetThuc: { gte: date } }],
      },
      include: { donViLamViec: true },
    });
  }

  findDepartmentDoctors(specialtyId: number) {
    return this.prisma.bacSi.findMany({
      where: {
        chuyenKhoaId: specialtyId,
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
      },
      include: {
        nguoiDung: { select: { id: true, hoTen: true } },
        chuyenKhoa: { select: { id: true, tenChuyenKhoa: true } },
      },
      orderBy: { maBacSi: 'asc' },
    });
  }

  findReceptionists() {
    return this.prisma.nhanVien.findMany({
      where: {
        chucVu: ChucVuNhanVien.LE_TAN_THU_NGAN,
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
      },
      select: { id: true, maNhanVien: true, hoTen: true, nguoiDungId: true },
      orderBy: { maNhanVien: 'asc' },
    });
  }

  findReceptionistDepartment() {
    return this.prisma.donViLamViec.findUnique({
      where: { maDonVi: 'BO_PHAN_TIEP_DON' },
      select: { id: true, maDonVi: true, tenDonVi: true },
    });
  }

  findDoctorRole() {
    return this.prisma.vaiTro.findUnique({ where: { maVaiTro: 'DOCTOR' } });
  }

  findReceptionistRole() {
    return this.prisma.vaiTro.findUnique({
      where: { maVaiTro: 'RECEPTIONIST' },
    });
  }

  findPharmacists() {
    return this.prisma.nhanVien.findMany({
      where: {
        chucVu: ChucVuNhanVien.DUOC_SI,
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
      },
      select: { id: true, maNhanVien: true, hoTen: true, nguoiDungId: true },
      orderBy: { maNhanVien: 'asc' },
    });
  }

  findPharmacistByUserId(userId: number) {
    return this.prisma.nhanVien.findFirst({
      where: {
        nguoiDungId: userId,
        chucVu: ChucVuNhanVien.DUOC_SI,
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
      },
      select: { id: true, maNhanVien: true, hoTen: true, nguoiDungId: true },
    });
  }

  findPharmacistDepartment() {
    return this.prisma.donViLamViec.findUnique({
      where: { maDonVi: 'BO_PHAN_DUOC' },
      select: { id: true, maDonVi: true, tenDonVi: true },
    });
  }

  findPharmacistRole() {
    return this.prisma.vaiTro.findUnique({ where: { maVaiTro: 'PHARMACIST' } });
  }

  findOrCreateNightShift() {
    const start = new Date('1970-01-01T16:30:00.000Z');
    const end = new Date('1970-01-01T07:00:00.000Z');
    return this.prisma.caLamViec.upsert({
      where: { maCa: 'TRUC_DEM' },
      update: {
        tenCa: 'Trực đêm',
        gioBatDau: start,
        gioKetThuc: end,
        quaNgay: true,
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
      },
      create: {
        maCa: 'TRUC_DEM',
        tenCa: 'Trực đêm',
        gioBatDau: start,
        gioKetThuc: end,
        quaNgay: true,
        moTa: 'Ca trực từ 16:30 đến 07:00 sáng hôm sau',
      },
    });
  }

  findOrCreateMorningShift() {
    const start = new Date('1970-01-01T07:00:00.000Z');
    const end = new Date('1970-01-01T16:30:00.000Z');
    return this.prisma.caLamViec.upsert({
      where: { maCa: 'SANG' },
      update: {
        tenCa: 'Ca sáng',
        gioBatDau: start,
        gioKetThuc: end,
        quaNgay: false,
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
      },
      create: {
        maCa: 'SANG',
        tenCa: 'Ca sáng',
        gioBatDau: start,
        gioKetThuc: end,
        quaNgay: false,
        moTa: 'Ca sáng từ 07:00 đến 16:30',
      },
    });
  }

  findOrCreateEveningShift() {
    return this.findOrCreateNightShift();
  }

  findAssignments(userIds: number[], from: Date, to: Date) {
    return this.prisma.phanCongCa.findMany({
      where: {
        nguoiDungId: { in: userIds },
        ngayLamViec: { gte: from, lte: to },
      },
      include: { caLamViec: true },
      orderBy: { ngayLamViec: 'asc' },
    });
  }

  async hasPublishedAssignments(unitId: number, from: Date, to: Date) {
    const count = await this.prisma.phanCongCa.count({
      where: {
        donViLamViecId: unitId,
        ngayLamViec: { gte: from, lte: to },
        caLamViec: { maCa: 'TRUC_DEM' },
        trangThai: TrangThaiPhanCongCa.DA_DUYET,
      },
    });
    return count > 0;
  }

  saveDraft(input: {
    unitId: number;
    roleId: number;
    shiftId: number;
    managerId: number;
    from: Date;
    to: Date;
    assignments: Array<{ userId: number; date: Date }>;
    ghiChu?: string;
  }) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.phanCongCa.deleteMany({
        where: {
          donViLamViecId: input.unitId,
          ngayLamViec: { gte: input.from, lte: input.to },
          // Thay lịch trực đêm mà không xóa lịch hành chính đã công bố.
          caLamViec: { maCa: 'TRUC_DEM' },
          trangThai: {
            in: [TrangThaiPhanCongCa.CHO_DUYET, TrangThaiPhanCongCa.DA_DUYET],
          },
        },
      });
      if (input.assignments.length) {
        await transaction.phanCongCa.createMany({
          data: input.assignments.map((assignment) => ({
            nguoiDungId: assignment.userId,
            vaiTroId: input.roleId,
            caLamViecId: input.shiftId,
            donViLamViecId: input.unitId,
            ngayLamViec: assignment.date,
            nguon: NguonPhanCongCa.TRUONG_DON_VI_PHAN_CONG,
            trangThai: TrangThaiPhanCongCa.CHO_DUYET,
            nguoiSapXepId: input.managerId,
            ghiChu: input.ghiChu,
          })),
        });
      }
    });
  }

  saveReceptionistDraft(input: {
    unitId: number;
    roleId: number;
    managerId: number;
    from: Date;
    to: Date;
    assignments: Array<{ userId: number; date: Date; shiftId: number }>;
    ghiChu?: string;
  }) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.phanCongCa.deleteMany({
        where: {
          donViLamViecId: input.unitId,
          ngayLamViec: { gte: input.from, lte: input.to },
          trangThai: {
            in: [TrangThaiPhanCongCa.CHO_DUYET, TrangThaiPhanCongCa.DA_DUYET],
          },
        },
      });
      if (input.assignments.length) {
        await transaction.phanCongCa.createMany({
          data: input.assignments.map((assignment) => ({
            nguoiDungId: assignment.userId,
            vaiTroId: input.roleId,
            caLamViecId: assignment.shiftId,
            donViLamViecId: input.unitId,
            ngayLamViec: assignment.date,
            nguon: NguonPhanCongCa.TRUONG_DON_VI_PHAN_CONG,
            trangThai: TrangThaiPhanCongCa.CHO_DUYET,
            nguoiSapXepId: input.managerId,
            ghiChu: input.ghiChu,
          })),
        });
      }
    });
  }

  async publish(
    unitId: number,
    from: Date,
    to: Date,
    managerId: number,
    onlyNightDuties = false,
  ) {
    const result = await this.prisma.phanCongCa.updateMany({
      where: {
        donViLamViecId: unitId,
        ngayLamViec: { gte: from, lte: to },
        ...(onlyNightDuties ? { caLamViec: { maCa: 'TRUC_DEM' } } : {}),
        trangThai: TrangThaiPhanCongCa.CHO_DUYET,
      },
      data: {
        trangThai: TrangThaiPhanCongCa.DA_DUYET,
        nguoiDuyetId: managerId,
        thoiGianDuyet: new Date(),
      },
    });
    return result.count;
  }

  findNextShiftStaff(unitId: number, date: Date, shiftCode: string) {
    return this.prisma.phanCongCa.findMany({
      where: {
        donViLamViecId: unitId,
        ngayLamViec: date,
        trangThai: TrangThaiPhanCongCa.DA_DUYET,
        caLamViec: { maCa: shiftCode },
      },
      include: {
        nguoiDung: { select: { id: true, hoTen: true } },
        caLamViec: { select: { maCa: true, tenCa: true } },
      },
    });
  }
}
