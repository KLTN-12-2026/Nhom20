import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Prisma,
  TrangThaiHoaDon,
  TrangThaiLuotKham,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateDoctorReviewDto } from './dto/create-doctor-review.dto';

const VISIT_INCLUDE = {
  chuyenKhoa: true,
  bacSi: true,
  hoSoKham: {
    include: {
      donThuoc: {
        include: {
          chiTiet: {
            include: {
              thuoc: {
                include: { hoatChatCauThanh: { include: { hoatChat: true } } },
              },
            },
          },
        },
      },
    },
  },
  hoaDon: { include: { thanhToan: { orderBy: { createdAt: 'desc' } } } },
  danhGiaBacSi: true,
} as const;

type PatientPortalVisit = Prisma.LuotKhamGetPayload<{
  include: typeof VISIT_INCLUDE;
}>;

@Injectable()
export class PatientPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyVisits(userId: number) {
    const patient = await this.getPatient(userId);
    const visits = await this.prisma.luotKham.findMany({
      where: {
        benhNhanId: patient.id,
        hoaDon: {
          trangThai: TrangThaiHoaDon.DA_THANH_TOAN,
        },
      },
      include: VISIT_INCLUDE,
      orderBy: { thoiGianHoanTat: 'desc' },
    });
    return {
      message: 'Lấy lịch sử khám thành công',
      data: visits.map((visit) => this.toVisitResponse(visit)),
    };
  }

  // Bệnh nhân gửi đánh giá bác sĩ theo lượt khám đã hoàn tất và thanh toán (chỉ gửi 1 lần duy nhất, không sửa/xóa)
  async createReview(
    userId: number,
    visitId: number,
    dto: CreateDoctorReviewDto,
  ) {
    const patient = await this.getPatient(userId);
    const visit = await this.prisma.luotKham.findFirst({
      where: { id: visitId, benhNhanId: patient.id },
      include: { hoaDon: true, danhGiaBacSi: true, bacSi: true },
    });
    if (!visit)
      throw new ForbiddenException('Bạn không có quyền đánh giá lượt khám này');
    if (visit.trangThai !== TrangThaiLuotKham.DA_HOAN_TAT)
      throw new BadRequestException('Lượt khám chưa hoàn tất');
    if (!visit.bacSiId || !visit.bacSi)
      throw new BadRequestException('Lượt khám chưa có bác sĩ phụ trách');
    if (visit.hoaDon?.trangThai !== TrangThaiHoaDon.DA_THANH_TOAN)
      throw new BadRequestException(
        'Chỉ được đánh giá sau khi hóa đơn đã thanh toán',
      );
    if (visit.danhGiaBacSi)
      throw new BadRequestException('Lượt khám này đã được đánh giá');

    const review = await this.prisma.danhGiaBacSi.create({
      data: {
        luotKhamId: visit.id,
        benhNhanId: patient.id,
        bacSiId: visit.bacSiId,
        soSao: dto.rating,
        noiDung: dto.comment?.trim() || null,
        trangThai: 'CHO_DUYET',
      },
    });
    return {
      message: 'Gửi đánh giá thành công, đánh giá đang chờ duyệt',
      data: {
        id: review.id,
        rating: review.soSao,
        comment: review.noiDung,
        status: review.trangThai,
        createdAt: review.createdAt,
      },
    };
  }

  private async getPatient(userId: number) {
    const patient = await this.prisma.benhNhan.findUnique({
      where: { nguoiDungId: userId },
    });
    if (!patient) throw new NotFoundException('Không tìm thấy hồ sơ bệnh nhân');
    return patient;
  }

  private toVisitResponse(visit: PatientPortalVisit) {
    const prescription = visit.hoSoKham?.donThuoc;
    const isReviewable =
      visit.trangThai === TrangThaiLuotKham.DA_HOAN_TAT &&
      visit.hoaDon?.trangThai === TrangThaiHoaDon.DA_THANH_TOAN &&
      !visit.danhGiaBacSi;
    return {
      id: visit.id,
      code: visit.maLuotKham,
      examinedAt: visit.thoiGianHoanTat ?? visit.thoiGianHen ?? visit.createdAt,
      status: visit.trangThai,
      specialty: visit.chuyenKhoa
        ? { name: visit.chuyenKhoa.tenChuyenKhoa }
        : null,
      doctor: visit.bacSi ? { name: visit.bacSi.hoTen } : null,
      diagnosis: visit.hoSoKham?.chanDoan ?? null,
      conclusion: visit.hoSoKham?.ketLuan ?? null,
      prescription: prescription
        ? {
            code: prescription.maDonThuoc,
            status: prescription.trangThai,
            items: prescription.chiTiet.map((item) => ({
              name: item.thuoc.tenThuoc,
              activeIngredient:
                item.thuoc.hoatChatCauThanh
                  .map((entry) => entry.hoatChat.tenHoatChat)
                  .join(', ') || null,
              unit: item.thuoc.donViTinh,
              quantity: item.soLuong,
              dosage: item.lieuDung,
              frequency: item.tanSuat,
              days: item.soNgaySuDung,
              instruction: item.huongDanSuDung,
            })),
          }
        : null,
      invoice: visit.hoaDon
        ? {
            code: visit.hoaDon.maHoaDon,
            total: Number(visit.hoaDon.tongTien),
            status: visit.hoaDon.trangThai,
            paidAt: visit.hoaDon.thoiGianThanhToan,
            payments: visit.hoaDon.thanhToan.map((payment) => ({
              amount: Number(payment.soTien),
              method: payment.phuongThuc,
              status: payment.trangThai,
              paidAt: payment.thoiGianThanhToan,
            })),
          }
        : null,
      review: visit.danhGiaBacSi
        ? {
            rating: visit.danhGiaBacSi.soSao,
            comment: visit.danhGiaBacSi.noiDung,
            status: visit.danhGiaBacSi.trangThai,
            createdAt: visit.danhGiaBacSi.createdAt,
          }
        : null,
      isReviewable,
    };
  }
}
