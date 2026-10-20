import { Injectable } from '@nestjs/common';
import {
  TrangThaiHangCho,
  TrangThaiHoSoKham,
  TrangThaiLuotKham,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  queueInclude,
  type QueueRepository,
} from './queue.repository.interface';

@Injectable()
export class PrismaQueueRepository implements QueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDoctorIdByUserId(userId: number) {
    const doctor = await this.prisma.bacSi.findUnique({
      where: { nguoiDungId: userId },
      select: { id: true },
    });
    return doctor?.id ?? null;
  }

  findDoctorQueue(doctorId: number, date: Date) {
    return this.prisma.phieuHangCho.findMany({
      where: {
        ngayXepHang: date,
        luotKham: { bacSiId: doctorId },
        trangThai: {
          in: [
            TrangThaiHangCho.DA_VAO_PHONG,
            TrangThaiHangCho.CHO_GOI,
            TrangThaiHangCho.DANG_GOI,
            TrangThaiHangCho.BO_QUA,
          ],
        },
      },
      include: queueInclude,
      orderBy: [{ soThuTu: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findPublicCalled(date: Date) {
    return this.prisma.phieuHangCho.findMany({
      where: {
        ngayXepHang: date,
        trangThai: TrangThaiHangCho.DANG_GOI,
      },
      include: queueInclude,
      orderBy: { thoiGianGoi: 'desc' },
      take: 12,
    });
  }

  findById(id: number) {
    return this.prisma.phieuHangCho.findUnique({
      where: { id },
      include: queueInclude,
    });
  }

  updateStatus(id: number, status: TrangThaiHangCho, userId: number) {
    const now = new Date();
    return this.prisma.$transaction(async (transaction) => {
      const ticket = await transaction.phieuHangCho.update({
        where: { id },
        data: {
          trangThai: status,
          ...(status === TrangThaiHangCho.DANG_GOI
            ? { thoiGianGoi: now, nguoiGoiId: userId }
            : {}),
          ...(status === TrangThaiHangCho.BO_QUA ? { thoiGianBoQua: now } : {}),
          ...(status === TrangThaiHangCho.DA_VAO_PHONG
            ? { thoiGianXacNhan: now }
            : {}),
        },
        include: queueInclude,
      });

      if (status === TrangThaiHangCho.DA_VAO_PHONG) {
        await transaction.luotKham.update({
          where: { id: ticket.luotKhamId },
          data: { trangThai: TrangThaiLuotKham.DA_VAO_PHONG },
        });

        const existingRecord = await transaction.hoSoKham.findUnique({
          where: { luotKhamId: ticket.luotKhamId },
        });
        if (!existingRecord) {
          await transaction.hoSoKham.create({
            data: {
              luotKhamId: ticket.luotKhamId,
              trangThai: TrangThaiHoSoKham.BAN_NHAP,
            },
          });
        }
      }
      return ticket;
    });
  }
}
