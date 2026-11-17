import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  LoaiMucHoaDon,
  TrangThaiHoaDon,
  TrangThaiDonThuoc,
  TrangThaiHangCho,
  TrangThaiHoSoKham,
  TrangThaiLuotKham,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  examinationInclude,
  visitForExaminationInclude,
  type ExaminationRepository,
  type ExaminationSaveData,
} from './examination.repository.interface';

@Injectable()
export class PrismaExaminationRepository implements ExaminationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDoctorId(userId: number) {
    const doctor = await this.prisma.bacSi.findUnique({
      where: { nguoiDungId: userId },
      select: { id: true },
    });
    return doctor?.id ?? null;
  }

  findActiveVisitByDoctorId(doctorId: number) {
    return this.prisma.luotKham.findFirst({
      where: {
        bacSiId: doctorId,
        trangThai: TrangThaiLuotKham.DA_VAO_PHONG,
      },
      include: visitForExaminationInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findVisitByAppointmentId(appointmentId: number) {
    return this.prisma.luotKham.findUnique({
      where: { lichHenId: appointmentId },
      include: visitForExaminationInclude,
    });
  }

  findVisitById(visitId: number) {
    return this.prisma.luotKham.findUnique({
      where: { id: visitId },
      include: visitForExaminationInclude,
    });
  }

  findMedicines(ids: number[]) {
    return this.prisma.thuoc.findMany({
      where: { id: { in: ids } },
      select: { id: true, tenThuoc: true, giaBan: true, trangThai: true },
    });
  }

  save(data: ExaminationSaveData) {
    return this.prisma.$transaction(async (transaction) => {
      // Autosave trễ phải chờ chuyển trạng thái và không được mở lại hồ sơ đã chốt.
      await transaction.$queryRaw`SELECT id FROM luot_kham WHERE id = ${data.visitId} FOR UPDATE`;
      const visit = await transaction.luotKham.findUniqueOrThrow({
        where: { id: data.visitId },
        select: { trangThai: true, hoSoKham: { select: { trangThai: true } } },
      });
      if (
        !['DANG_CHO', 'DA_VAO_PHONG', 'CHO_KET_QUA'].includes(
          visit.trangThai,
        ) ||
        visit.hoSoKham?.trangThai === 'DA_HOAN_TAT'
      ) {
        throw new BadRequestException(
          'Lượt khám đã đóng; không thể ghi bản nháp',
        );
      }
      const isComplete = data.status === TrangThaiHoSoKham.DA_HOAN_TAT;
      const record = await transaction.hoSoKham.upsert({
        where: { luotKhamId: data.visitId },
        update: {
          trieuChung: data.symptoms,
          chanDoan: data.diagnosis,
          maIcd10: data.icd10Code,
          sinhHieu: data.vitals,
          noiDungChuyenKhoa: data.specialtyData ?? data.specialtyContent,
          ketLuan: data.conclusion,
          ghiChuBacSi: data.doctorNotes,
          ngayTaiKham: data.followUpDate,
          trangThai: data.status,
          thoiGianNop: isComplete ? new Date() : null,
        },
        create: {
          luotKhamId: data.visitId,
          trieuChung: data.symptoms,
          chanDoan: data.diagnosis,
          maIcd10: data.icd10Code,
          sinhHieu: data.vitals,
          noiDungChuyenKhoa: data.specialtyData ?? data.specialtyContent,
          ketLuan: data.conclusion,
          ghiChuBacSi: data.doctorNotes,
          ngayTaiKham: data.followUpDate,
          trangThai: data.status,
          thoiGianNop: isComplete ? new Date() : null,
        },
      });

      // Lưu hồ sơ chuyên khoa cùng transaction để không có phiếu khám thiếu dữ liệu đặc thù.
      if (data.specialtyId && data.specialtyData !== undefined) {
        await transaction.chiTietKhamChuyenKhoa.upsert({
          where: { hoSoKhamId: record.id },
          update: {
            chuyenKhoaId: data.specialtyId,
            duLieu: data.specialtyData,
          },
          create: {
            hoSoKhamId: record.id,
            chuyenKhoaId: data.specialtyId,
            duLieu: data.specialtyData,
          },
        });
      }

      if (data.prescription !== undefined) {
        const current = await transaction.donThuoc.findUnique({
          where: { hoSoKhamId: record.id },
        });
        if (current) {
          await transaction.chiTietDonThuoc.deleteMany({
            where: { donThuocId: current.id },
          });
        }
        if (data.prescription.length) {
          const prescription = await transaction.donThuoc.upsert({
            where: { hoSoKhamId: record.id },
            update: {
              trangThai: TrangThaiDonThuoc.CHO_CAP_THUOC,
              ghiChuBacSi: data.doctorNotes,
            },
            create: {
              maDonThuoc: `DT-${Date.now()}`,
              hoSoKhamId: record.id,
              ghiChuBacSi: data.doctorNotes,
            },
          });
          await transaction.chiTietDonThuoc.createMany({
            data: data.prescription.map((line) => ({
              donThuocId: prescription.id,
              thuocId: line.medicineId,
              soLuong: line.quantity,
              lieuDung: line.dosage,
              tanSuat: line.frequency,
              soNgaySuDung: line.days,
              huongDanSuDung: line.instructions,
              donGia: line.unitPrice,
              thanhTien: line.unitPrice.mul(line.quantity),
            })),
          });
        } else if (current) {
          await transaction.donThuoc.delete({ where: { id: current.id } });
        }
      }

      if (isComplete) {
        await transaction.luotKham.update({
          where: { id: data.visitId },
          data: {
            trangThai: TrangThaiLuotKham.DA_HOAN_TAT,
            thoiGianHoanTat: new Date(),
          },
        });
        await transaction.phieuHangCho.updateMany({
          where: { luotKhamId: data.visitId },
          data: {
            trangThai: TrangThaiHangCho.DA_HOAN_TAT,
            thoiGianHoanTat: new Date(),
          },
        });
      }
      return transaction.hoSoKham.findUniqueOrThrow({
        where: { id: record.id },
        include: examinationInclude,
      });
    });
  }

  // Hoàn tất chỉ sau khi dịch vụ cảnh báo đã cho phép chốt hồ sơ.
  markComplete(recordId: number, visitId: number, currentUserId: number) {
    return this.prisma.$transaction(async (transaction) => {
      // Khóa cùng hàng với API tạo chỉ định, tránh race tạo chỉ định khi đang hoàn tất.
      await transaction.$queryRaw`SELECT id FROM luot_kham WHERE id = ${visitId} FOR UPDATE`;
      const lockedVisit = await transaction.luotKham.findUniqueOrThrow({
        where: { id: visitId },
        select: { trangThai: true },
      });
      if (lockedVisit.trangThai === 'CHO_KET_QUA') {
        throw new BadRequestException(
          'Hãy tiếp tục lượt khám trước khi hoàn tất',
        );
      }
      const pendingOrders = await transaction.chiDinhDichVu.count({
        where: { luotKhamId: visitId, trangThai: 'CHO_THUC_HIEN' },
      });
      if (pendingOrders > 0) {
        throw new BadRequestException(
          'Còn chỉ định dịch vụ chưa có kết quả hoặc chưa hủy; không thể hoàn tất khám',
        );
      }
      let invoiceForReception: { id: number; code: string } | null = null;
      const currentRecord = await transaction.hoSoKham.findUniqueOrThrow({
        where: { id: recordId },
        select: { luotKhamId: true, donThuoc: { select: { id: true } } },
      });
      if (currentRecord.luotKhamId !== visitId) {
        throw new Error('Hồ sơ không thuộc lượt khám');
      }
      {
        // Khóa hóa đơn theo cùng thứ tự với API chỉ định; thanh toán cũng phải lấy khóa này.
        await transaction.$queryRaw`SELECT id FROM hoa_don WHERE luot_kham_id = ${visitId} FOR UPDATE`;
        const visit = await transaction.luotKham.findUniqueOrThrow({
          where: { id: visitId },
          select: {
            benhNhanId: true,
            chuyenKhoa: {
              select: {
                maChuyenKhoa: true,
                tenChuyenKhoa: true,
                phiKham: true,
              },
            },
          },
        });
        const examFee = visit.chuyenKhoa.phiKham;
        if (examFee.isNegative()) throw new Error('Phí khám không hợp lệ');
        // Chốt phí khám cùng transaction; không sửa hóa đơn đã tồn tại hoặc thanh toán.
        // Đọc trước để không gọi upsert/update dù rỗng trên hóa đơn đã tồn tại.
        const existingInvoice = await transaction.hoaDon.findUnique({
          where: { luotKhamId: visitId },
          select: { id: true, maHoaDon: true, trangThai: true },
        });
        const invoice =
          existingInvoice ??
          (await transaction.hoaDon.upsert({
            where: { luotKhamId: visitId },
            update: {},
            create: {
              maHoaDon: `HD-${Date.now()}-${visitId}`,
              luotKhamId: visitId,
              benhNhanId: visit.benhNhanId,
              nguoiTaoId: currentUserId,
              tienKham: examFee,
              tienThuoc: new Prisma.Decimal(0),
              phiDichVu: new Prisma.Decimal(0),
              tongTien: examFee,
              trangThai: currentRecord.donThuoc
                ? TrangThaiHoaDon.BAN_NHAP
                : TrangThaiHoaDon.CHUA_THANH_TOAN,
              chiTiet: {
                create: {
                  loaiMuc: LoaiMucHoaDon.PHI_KHAM,
                  maMuc: visit.chuyenKhoa.maChuyenKhoa,
                  tenMuc: `Phí khám ${visit.chuyenKhoa.tenChuyenKhoa}`,
                  soLuong: 1,
                  donGia: examFee,
                  thanhTien: examFee,
                },
              },
            },
            select: { id: true, maHoaDon: true, trangThai: true },
          }));
        if (invoice.trangThai === TrangThaiHoaDon.DA_HUY) {
          throw new BadRequestException(
            'Hóa đơn đã bị hủy; không thể hoàn tất lượt khám',
          );
        }
        const orders = await transaction.chiDinhDichVu.findMany({
          where: { luotKhamId: visitId, trangThai: 'DA_HOAN_TAT' },
          include: { dichVu: { select: { maDichVu: true, tenDichVu: true } } },
        });
        const existingLines = await transaction.chiTietHoaDon.findMany({
          where: {
            OR: [
              { hoaDonId: invoice.id, chiDinhDichVuId: { not: null } },
              { chiDinhDichVuId: { in: orders.map((order) => order.id) } },
            ],
          },
          select: {
            chiDinhDichVuId: true,
            hoaDonId: true,
            dichVuId: true,
            loaiMuc: true,
            donGia: true,
            thanhTien: true,
            soLuong: true,
          },
        });
        for (const line of existingLines) {
          const order = orders.find((item) => item.id === line.chiDinhDichVuId);
          if (
            !order ||
            line.hoaDonId !== invoice.id ||
            line.dichVuId !== order.dichVuId ||
            line.loaiMuc !== LoaiMucHoaDon.DICH_VU ||
            line.soLuong !== 1 ||
            !line.donGia.equals(order.donGiaSnapshot) ||
            !line.thanhTien.equals(order.donGiaSnapshot)
          ) {
            throw new BadRequestException(
              'Phí chỉ định trên hóa đơn không khớp; cần đối soát thủ công',
            );
          }
        }
        const missing = orders.filter(
          (order) =>
            !existingLines.some((line) => line.chiDinhDichVuId === order.id),
        );
        if (
          invoice.trangThai === TrangThaiHoaDon.DA_THANH_TOAN &&
          missing.length
        ) {
          throw new BadRequestException(
            'Hóa đơn đã thanh toán nhưng thiếu phí chỉ định; cần đối soát thủ công',
          );
        }
        if (missing.length) {
          const legacyLine = await transaction.chiTietHoaDon.findFirst({
            where: {
              hoaDonId: invoice.id,
              loaiMuc: LoaiMucHoaDon.DICH_VU,
              chiDinhDichVuId: null,
              dichVuId: { in: missing.map((order) => order.dichVuId) },
            },
            select: { id: true },
          });
          if (legacyLine)
            throw new BadRequestException(
              'Hóa đơn có phí dịch vụ chưa liên kết chỉ định; cần đối soát thủ công',
            );
          const amount = missing.reduce(
            (sum, order) => sum.add(order.donGiaSnapshot),
            new Prisma.Decimal(0),
          );
          if (missing.some((order) => order.donGiaSnapshot.isNegative()))
            throw new BadRequestException('Giá chỉ định không hợp lệ');
          await transaction.chiTietHoaDon.createMany({
            data: missing.map((order) => ({
              hoaDonId: invoice.id,
              chiDinhDichVuId: order.id,
              dichVuId: order.dichVuId,
              loaiMuc: LoaiMucHoaDon.DICH_VU,
              maMuc: order.dichVu.maDichVu,
              tenMuc: order.dichVu.tenDichVu,
              soLuong: 1,
              donGia: order.donGiaSnapshot,
              thanhTien: order.donGiaSnapshot,
            })),
          });
          await transaction.hoaDon.update({
            where: { id: invoice.id },
            data: {
              phiDichVu: { increment: amount },
              tongTien: { increment: amount },
            },
          });
        }
        if (
          !currentRecord.donThuoc &&
          invoice.trangThai !== TrangThaiHoaDon.DA_THANH_TOAN
        ) {
          invoiceForReception = { id: invoice.id, code: invoice.maHoaDon };
        }
      }
      await transaction.hoSoKham.update({
        where: { id: recordId },
        data: {
          trangThai: TrangThaiHoSoKham.DA_HOAN_TAT,
          thoiGianNop: new Date(),
        },
      });
      await transaction.luotKham.update({
        where: { id: visitId },
        data: {
          trangThai: TrangThaiLuotKham.DA_HOAN_TAT,
          thoiGianHoanTat: new Date(),
        },
      });
      await transaction.phieuHangCho.updateMany({
        where: { luotKhamId: visitId },
        data: {
          trangThai: TrangThaiHangCho.DA_HOAN_TAT,
          thoiGianHoanTat: new Date(),
        },
      });
      const completed = await transaction.hoSoKham.findUniqueOrThrow({
        where: { id: recordId },
        include: examinationInclude,
      });
      return { ...completed, invoiceForReception };
    });
  }

  async findHistory(input: {
    doctorId: number;
    search?: string;
    from?: Date;
    to?: Date;
    skip: number;
    take: number;
  }) {
    const where: Prisma.HoSoKhamWhereInput = {
      luotKham: { bacSiId: input.doctorId },
      trangThai: TrangThaiHoSoKham.DA_HOAN_TAT,
      ...(input.search
        ? {
            OR: [
              {
                luotKham: {
                  benhNhan: {
                    hoTen: { contains: input.search, mode: 'insensitive' },
                  },
                },
              },
              {
                luotKham: {
                  benhNhan: {
                    maBenhNhan: { contains: input.search, mode: 'insensitive' },
                  },
                },
              },
              { chanDoan: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(input.from || input.to
        ? {
            thoiGianNop: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.hoSoKham.findMany({
        where,
        include: examinationInclude,
        orderBy: { thoiGianNop: 'desc' },
        skip: input.skip,
        take: input.take,
      }),
      this.prisma.hoSoKham.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: number) {
    return this.prisma.hoSoKham.findUnique({
      where: { id },
      include: examinationInclude,
    });
  }
}
