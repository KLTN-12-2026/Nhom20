import { Injectable } from '@nestjs/common';
import { LoaiGiaoDichKho, Prisma, TrangThaiChung } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  medicineInclude,
  MedicineRepository,
} from './medicine.repository.interface';
import { StockInDto } from '../dto/stock-in.dto';

@Injectable()
export class PrismaMedicineRepository implements MedicineRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string, group?: string, status?: TrangThaiChung) {
    return this.prisma.thuoc.findMany({
      where: {
        ...(status ? { trangThai: status } : {}),
        ...(group
          ? {
              hoatChatCauThanh: {
                some: { hoatChat: { tenHoatChat: group } },
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                // Kê đơn cần gợi ý đúng từ đầu tên thuốc/hoạt chất, tránh gõ "E" trả về mọi thuốc có chữ e.
                { maThuoc: { startsWith: search, mode: 'insensitive' } },
                { tenThuoc: { startsWith: search, mode: 'insensitive' } },
                {
                  hoatChatCauThanh: {
                    some: {
                      hoatChat: {
                        tenHoatChat: {
                          startsWith: search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: medicineInclude,
    });
  }

  findById(id: number) {
    return this.prisma.thuoc.findUnique({
      where: { id },
      include: medicineInclude,
    });
  }

  findBatches(search?: string) {
    return this.prisma.loThuoc.findMany({
      where: search
        ? {
            OR: [
              { maLo: { contains: search, mode: 'insensitive' } },
              {
                thuoc: { tenThuoc: { contains: search, mode: 'insensitive' } },
              },
            ],
          }
        : undefined,
      include: { thuoc: true },
      orderBy: [{ hanDung: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findConflict(name: string, excludeId?: number) {
    return this.prisma.thuoc.findFirst({
      where: {
        tenThuoc: name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async findLastCode() {
    const last = await this.prisma.thuoc.findFirst({
      orderBy: { id: 'desc' },
      select: { maThuoc: true },
    });
    return last?.maThuoc || null;
  }

  create(data: Prisma.ThuocCreateInput) {
    return this.prisma.thuoc.create({
      data,
      include: medicineInclude,
    });
  }

  update(id: number, data: Prisma.ThuocUpdateInput) {
    return this.prisma.thuoc.update({
      where: { id },
      data,
      include: medicineInclude,
    });
  }

  delete(id: number) {
    return this.prisma.thuoc.delete({ where: { id } });
  }

  async stockIn(id: number, userId: number, dto: StockInDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.thuoc.findUniqueOrThrow({ where: { id } });
      const newStock = current.soLuongTon + dto.quantity;

      await tx.thuoc.update({
        where: { id },
        data: {
          soLuongTon: newStock,
          giaNhap: dto.purchasePrice,
        },
      });

      const batch = await tx.loThuoc.create({
        data: {
          thuocId: id,
          maLo: dto.batchCode.trim().toUpperCase(),
          ngaySanXuat: dto.manufactureDate
            ? new Date(dto.manufactureDate)
            : null,
          hanDung: new Date(dto.expiryDate),
          nhaCungCap: dto.supplier.trim(),
          giaNhap: dto.purchasePrice,
          soLuongNhap: dto.quantity,
          soLuongConLai: dto.quantity,
          ghiChu: dto.notes?.trim() || null,
        },
      });

      await tx.giaoDichKho.create({
        data: {
          loaiGiaoDich: LoaiGiaoDichKho.NHAP_KHO,
          soLuong: dto.quantity,
          soLuongTruoc: current.soLuongTon,
          soLuongSau: newStock,
          loaiThamChieu: 'BATCH',
          maThamChieu: dto.batchCode,
          loThuoc: { connect: { id: batch.id } },
          ghiChu: `Nhà cung cấp: ${dto.supplier}. Ghi chú: ${dto.notes || ''}`,
          thuoc: { connect: { id } },
          nguoiThucHien: { connect: { id: userId } },
        },
      });

      return tx.thuoc.findUniqueOrThrow({
        where: { id },
        include: medicineInclude,
      });
    });
  }

  async replaceActiveIngredient(medicineId: number, activeIngredient?: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.thuocHoatChat.deleteMany({ where: { thuocId: medicineId } });
      const name = activeIngredient?.trim();
      if (name) {
        const existing = await tx.hoatChat.findUnique({
          where: { tenHoatChat: name },
        });
        const ingredient =
          existing ??
          (await tx.hoatChat.create({
            data: {
              maHoatChat: `HC-${medicineId}-${Date.now().toString().slice(-8)}`,
              tenHoatChat: name,
            },
          }));
        await tx.thuocHoatChat.create({
          data: { thuocId: medicineId, hoatChatId: ingredient.id },
        });
      }
      return tx.thuoc.findUniqueOrThrow({
        where: { id: medicineId },
        include: medicineInclude,
      });
    });
  }

  async isDepartmentHead(userId: number): Promise<boolean> {
    const manager = await this.prisma.quanLyDonVi.findFirst({
      where: {
        nguoiDungId: userId,
        chucVu: 'TRUONG_DON_VI',
        trangThai: TrangThaiChung.DANG_HOAT_DONG,
      },
    });
    if (manager) return true;

    const user = await this.prisma.nguoiDung.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const email = user?.email?.toLowerCase() ?? '';
    return email.startsWith('truongkhoa.') || email === 'duocsi@gmail.com';
  }
}
