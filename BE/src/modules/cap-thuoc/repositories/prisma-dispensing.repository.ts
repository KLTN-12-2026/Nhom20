import { Injectable } from '@nestjs/common';
import {
  LoaiGiaoDichKho,
  LoaiMucHoaDon,
  Prisma,
  TrangThaiDonThuoc,
  TrangThaiHoaDon,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  dispensingInclude,
  type DispensingRepository,
  type DispenseAllocation,
} from './dispensing.repository.interface';

@Injectable()
export class PrismaDispensingRepository implements DispensingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.donThuoc.findUnique({
      where: { id },
      include: dispensingInclude,
    });
  }

  async findPending(input: { search?: string; skip: number; take: number }) {
    const where: Prisma.DonThuocWhereInput = {
      trangThai: TrangThaiDonThuoc.CHO_CAP_THUOC,
      hoSoKham: { trangThai: 'DA_HOAN_TAT' },
      ...(input.search
        ? {
            OR: [
              { maDonThuoc: { contains: input.search, mode: 'insensitive' } },
              {
                hoSoKham: {
                  luotKham: {
                    benhNhan: {
                      hoTen: { contains: input.search, mode: 'insensitive' },
                    },
                  },
                },
              },
              {
                hoSoKham: {
                  luotKham: {
                    bacSi: {
                      hoTen: { contains: input.search, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.donThuoc.findMany({
        where,
        include: dispensingInclude,
        orderBy: { createdAt: 'desc' },
        skip: input.skip,
        take: input.take,
      }),
      this.prisma.donThuoc.count({ where }),
    ]);
    return { items, total };
  }

  async findProcessing(input: {
    pharmacistId: number;
    search?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.DonThuocWhereInput = {
      trangThai: TrangThaiDonThuoc.DANG_XU_LY,
      nguoiCapThuocId: input.pharmacistId,
      ...(input.search
        ? {
            OR: [
              { maDonThuoc: { contains: input.search, mode: 'insensitive' } },
              {
                hoSoKham: {
                  luotKham: {
                    benhNhan: {
                      hoTen: { contains: input.search, mode: 'insensitive' },
                    },
                  },
                },
              },
              {
                hoSoKham: {
                  luotKham: {
                    bacSi: {
                      hoTen: { contains: input.search, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.donThuoc.findMany({
        where,
        include: dispensingInclude,
        orderBy: { updatedAt: 'desc' },
        skip: input.skip,
        take: input.take,
      }),
      this.prisma.donThuoc.count({ where }),
    ]);
    return { items, total };
  }

  async findHistory(input: { search?: string; skip: number; take: number }) {
    const where: Prisma.DonThuocWhereInput = {
      trangThai: {
        in: [
          TrangThaiDonThuoc.DA_CAP_THUOC,
          TrangThaiDonThuoc.TU_CHOI_CAP_THUOC,
        ],
      },
      ...(input.search
        ? {
            OR: [
              { maDonThuoc: { contains: input.search, mode: 'insensitive' } },
              {
                hoSoKham: {
                  luotKham: {
                    benhNhan: {
                      hoTen: { contains: input.search, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.donThuoc.findMany({
        where,
        include: dispensingInclude,
        orderBy: { updatedAt: 'desc' },
        skip: input.skip,
        take: input.take,
      }),
      this.prisma.donThuoc.count({ where }),
    ]);
    return { items, total };
  }

  accept(id: number, pharmacistId: number) {
    return this.prisma.donThuoc.update({
      where: { id },
      data: {
        trangThai: TrangThaiDonThuoc.DANG_XU_LY,
        nguoiCapThuocId: pharmacistId,
      },
      include: dispensingInclude,
    });
  }

  refuse(id: number, pharmacistId: number, reason: string) {
    return this.prisma.donThuoc.update({
      where: { id },
      data: {
        trangThai: TrangThaiDonThuoc.TU_CHOI_CAP_THUOC,
        lyDoTuChoi: reason,
        nguoiTuChoiId: pharmacistId,
        thoiGianTuChoi: new Date(),
      },
      include: dispensingInclude,
    });
  }

  dispense(input: {
    id: number;
    pharmacistId: number;
    allocations: DispenseAllocation[];
    notes?: string;
  }) {
    return this.prisma.$transaction(
      async (transaction) => {
        for (const allocation of input.allocations) {
          const batch = await transaction.loThuoc.findUniqueOrThrow({
            where: { id: allocation.batchId },
          });
          if (
            batch.thuocId !== allocation.medicineId ||
            batch.soLuongConLai < allocation.quantity ||
            batch.hanDung < new Date()
          ) {
            throw new Error('BATCH_STOCK_CHANGED');
          }
          const updatedBatch = await transaction.loThuoc.update({
            where: { id: batch.id },
            data: { soLuongConLai: { decrement: allocation.quantity } },
          });
          const medicine = await transaction.thuoc.findUniqueOrThrow({
            where: { id: allocation.medicineId },
          });
          const updatedMedicine = await transaction.thuoc.update({
            where: { id: medicine.id },
            data: { soLuongTon: { decrement: allocation.quantity } },
          });
          await transaction.chiTietCapThuoc.create({
            data: {
              donThuocId: input.id,
              chiTietDonThuocId: allocation.prescriptionItemId,
              loThuocId: allocation.batchId,
              soLuong: allocation.quantity,
            },
          });
          await transaction.giaoDichKho.create({
            data: {
              thuocId: allocation.medicineId,
              loThuocId: allocation.batchId,
              loaiGiaoDich: LoaiGiaoDichKho.CAP_THUOC,
              soLuong: allocation.quantity,
              soLuongTruoc: medicine.soLuongTon,
              soLuongSau: updatedMedicine.soLuongTon,
              loaiThamChieu: 'PRESCRIPTION',
              maThamChieu: String(input.id),
              ghiChu:
                input.notes ||
                `Cấp từ lô ${batch.maLo}; tồn lô còn ${updatedBatch.soLuongConLai}`,
              nguoiThucHienId: input.pharmacistId,
            },
          });
        }

        const prescriptionForInvoice =
          await transaction.donThuoc.findUniqueOrThrow({
            where: { id: input.id },
            include: {
              chiTiet: { include: { thuoc: true } },
              hoSoKham: {
                include: {
                  luotKham: { include: { chuyenKhoa: true } },
                },
              },
            },
          });
        const visit = prescriptionForInvoice.hoSoKham.luotKham;
        const examFee = visit.chuyenKhoa.phiKham;
        const medicineFee = prescriptionForInvoice.chiTiet.reduce(
          (total, item) => total.add(item.thanhTien),
          new Prisma.Decimal(0),
        );
        const total = examFee.add(medicineFee);
        const existingInvoice = await transaction.hoaDon.findUnique({
          where: { luotKhamId: visit.id },
          select: { id: true, trangThai: true },
        });
        if (existingInvoice?.trangThai === TrangThaiHoaDon.DA_THANH_TOAN) {
          throw new Error('INVOICE_ALREADY_PAID');
        }
        const invoice = existingInvoice
          ? await transaction.hoaDon.update({
              where: { id: existingInvoice.id },
              data: {
                tienKham: examFee,
                tienThuoc: medicineFee,
                phiDichVu: new Prisma.Decimal(0),
                tongTien: total,
                trangThai: TrangThaiHoaDon.CHUA_THANH_TOAN,
                thoiGianThanhToan: null,
              },
            })
          : await transaction.hoaDon.create({
              data: {
                maHoaDon: `HD-${Date.now()}-${visit.id}`,
                luotKhamId: visit.id,
                benhNhanId: visit.benhNhanId,
                tienKham: examFee,
                tienThuoc: medicineFee,
                phiDichVu: new Prisma.Decimal(0),
                tongTien: total,
                trangThai: TrangThaiHoaDon.CHUA_THANH_TOAN,
                nguoiTaoId: input.pharmacistId,
              },
            });

        await transaction.chiTietHoaDon.deleteMany({
          where: { hoaDonId: invoice.id },
        });
        await transaction.chiTietHoaDon.createMany({
          data: [
            {
              hoaDonId: invoice.id,
              loaiMuc: LoaiMucHoaDon.PHI_KHAM,
              maMuc: visit.chuyenKhoa.maChuyenKhoa,
              tenMuc: `Phí khám ${visit.chuyenKhoa.tenChuyenKhoa}`,
              soLuong: 1,
              donGia: examFee,
              thanhTien: examFee,
            },
            ...prescriptionForInvoice.chiTiet.map((item) => ({
              hoaDonId: invoice.id,
              thuocId: item.thuocId,
              loaiMuc: LoaiMucHoaDon.TIEN_THUOC,
              maMuc: item.thuoc.maThuoc,
              tenMuc: item.thuoc.tenThuoc,
              soLuong: item.soLuong,
              donGia: item.donGia,
              thanhTien: item.thanhTien,
            })),
          ],
        });

        return transaction.donThuoc.update({
          where: { id: input.id },
          data: {
            trangThai: TrangThaiDonThuoc.DA_CAP_THUOC,
            nguoiCapThuocId: input.pharmacistId,
            thoiGianCapThuoc: new Date(),
          },
          include: dispensingInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  updateStatus(id: number, status: TrangThaiDonThuoc) {
    return this.prisma.donThuoc.update({
      where: { id },
      data: { trangThai: status },
      include: dispensingInclude,
    });
  }
}
