import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LoaiCanhBaoDonThuoc,
  MucDoCanhBao,
  NguonCanhBao,
  PhanHeNhatKyHeThong,
  TrangThaiChung,
  TrangThaiXuLyCanhBao,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { AuditLogsService } from '../nhat-ky-he-thong/audit-logs.service';
import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../thoi-gian-thuc/realtime.events';
import { RealtimeService } from '../thoi-gian-thuc/realtime.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { ResolvePrescriptionWarningDto } from './dto/resolve-prescription-warning.dto';

type NewWarning = {
  medicineId?: number;
  ingredientId?: number;
  type: LoaiCanhBaoDonThuoc;
  severity: MucDoCanhBao;
  title: string;
  content: string;
  recommendation: string;
  evidence?: Record<string, unknown>;
};

// KIỂM TRA DỊ ỨNG KHI KÊ ĐƠN
function normalizeMedicineText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .trim();
}

@Injectable()
export class PrescriptionSafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly thongBaoService: ThongBaoService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Đọc đơn đã lưu và sinh cảnh báo từ dữ liệu hồ sơ, hoạt chất và lô thuốc.
  async refreshWarnings(prescriptionId: number | undefined) {
    if (!prescriptionId) return [];

    const prescription = await this.prisma.donThuoc.findUnique({
      where: { id: prescriptionId },
      include: {
        hoSoKham: {
          include: {
            luotKham: {
              include: {
                benhNhan: { include: { diUng: true } },
                bacSi: { select: { id: true, nguoiDungId: true } },
              },
            },
          },
        },
        chiTiet: {
          include: {
            thuoc: {
              include: {
                hoatChatCauThanh: { include: { hoatChat: true } },
                loThuoc: true,
              },
            },
          },
        },
      },
    });
    if (!prescription) return [];

    const now = new Date();
    const warnings: NewWarning[] = [];
    const ingredientUsage = new Map<
      number,
      Array<{ medicineId: number; medicineName: string }>
    >();
    const allergies = prescription.hoSoKham.luotKham.benhNhan.diUng;

    for (const line of prescription.chiTiet) {
      const medicine = line.thuoc;
      const medicineText = normalizeMedicineText(medicine.tenThuoc);
      const matchedIngredientByName = medicine.hoatChatCauThanh.find((link) => {
        const ingredientText = normalizeMedicineText(link.hoatChat.tenHoatChat);
        return allergies.some((allergy) => {
          const allergyText = normalizeMedicineText(allergy.tacNhanDiUng);
          return allergyText.length >= 4 && (
            ingredientText.includes(allergyText) || allergyText.includes(ingredientText)
          );
        });
      });
      const allergyMatchedByName = allergies.find((allergy) => {
        const allergyText = normalizeMedicineText(allergy.tacNhanDiUng);
        if (allergyText.length < 4) return false;
        return (
          medicineText.includes(allergyText) ||
          medicine.hoatChatCauThanh.some((link) => {
            const ingredientText = normalizeMedicineText(
              link.hoatChat.tenHoatChat,
            );
            return (
              ingredientText.includes(allergyText) ||
              allergyText.includes(ingredientText)
            );
          })
        );
      });
      if (allergyMatchedByName) {
        const conflictingIngredient = matchedIngredientByName?.hoatChat;
        warnings.push({
          medicineId: medicine.id,
          ingredientId: conflictingIngredient?.id,
          type: LoaiCanhBaoDonThuoc.DI_UNG_THUOC,
          severity: MucDoCanhBao.NGHIEM_TRONG,
          title: `Nguy cơ dị ứng: ${medicine.tenThuoc}`,
          content: conflictingIngredient
            ? `${medicine.tenThuoc} chứa hoạt chất ${conflictingIngredient.tenHoatChat} trùng với dị ứng đã ghi nhận.`
            : `${medicine.tenThuoc} trùng với dị ứng đã ghi nhận trong hồ sơ bệnh nhân.`,
          recommendation:
            'Kiểm tra lại tiền sử dị ứng và cân nhắc thuốc thay thế.',
          evidence: {
            allergyId: allergyMatchedByName.id,
            allergyName: allergyMatchedByName.tacNhanDiUng,
            reaction: allergyMatchedByName.phanUng,
            conflictingIngredient: conflictingIngredient?.tenHoatChat,
          },
        });
      }

      const validLots = medicine.loThuoc.filter(
        (lot) =>
          lot.trangThai === TrangThaiChung.DANG_HOAT_DONG &&
          lot.hanDung >= now &&
          lot.soLuongConLai > 0,
      );
      const available = validLots.reduce(
        (sum, lot) => sum + lot.soLuongConLai,
        0,
      );
      if (
        !validLots.length &&
        medicine.loThuoc.some((lot) => lot.hanDung < now)
      ) {
        warnings.push({
          medicineId: medicine.id,
          type: LoaiCanhBaoDonThuoc.THUOC_HET_HAN,
          severity: MucDoCanhBao.NGHIEM_TRONG,
          title: `Không có lô còn hạn: ${medicine.tenThuoc}`,
          content:
            'Kho chỉ còn lô đã hết hạn hoặc không còn lô đủ điều kiện cấp thuốc.',
          recommendation: 'Đổi thuốc hoặc bổ sung lô còn hạn trước khi cấp.',
          evidence: { availableLots: 0 },
        });
      } else if (available < line.soLuong) {
        warnings.push({
          medicineId: medicine.id,
          type: LoaiCanhBaoDonThuoc.TON_KHO_KHONG_DU,
          severity: MucDoCanhBao.NGHIEM_TRONG,
          title: `Tồn kho không đủ: ${medicine.tenThuoc}`,
          content: `Đơn cần ${line.soLuong} ${medicine.donViTinh}, kho còn khả dụng ${available} ${medicine.donViTinh}.`,
          recommendation:
            'Điều chỉnh số lượng, đổi thuốc hoặc nhập thêm lô trước khi cấp.',
          evidence: {
            requested: line.soLuong,
            available,
            unit: medicine.donViTinh,
          },
        });
      }

      for (const ingredientLink of medicine.hoatChatCauThanh) {
        const ingredientId = ingredientLink.hoatChatId;
        const existing = ingredientUsage.get(ingredientId) ?? [];
        existing.push({
          medicineId: medicine.id,
          medicineName: medicine.tenThuoc,
        });
        ingredientUsage.set(ingredientId, existing);

        const allergy = allergyMatchedByName
          ? undefined
          : allergies.find(
              (item) =>
                item.thuocId === medicine.id ||
                item.hoatChatId === ingredientId,
            );
        if (allergy) {
          warnings.push({
            medicineId: medicine.id,
            ingredientId,
            type: LoaiCanhBaoDonThuoc.DI_UNG_THUOC,
            severity: MucDoCanhBao.NGHIEM_TRONG,
            title: `Nguy cơ dị ứng: ${medicine.tenThuoc}`,
            content: `Hồ sơ bệnh nhân ghi nhận dị ứng với ${allergy.tacNhanDiUng}.`,
            recommendation:
              'Kiểm tra lại tiền sử dị ứng và cân nhắc thuốc thay thế.',
            evidence: {
              allergyId: allergy.id,
              allergyName: allergy.tacNhanDiUng,
              reaction: allergy.phanUng,
              conflictingIngredient: ingredientLink.hoatChat.tenHoatChat,
            },
          });
        }
      }
    }

    for (const [ingredientId, medicines] of ingredientUsage) {
      if (medicines.length < 2) continue;
      const ingredientName = prescription.chiTiet
        .flatMap((line) => line.thuoc.hoatChatCauThanh)
        .find((item) => item.hoatChatId === ingredientId)?.hoatChat.tenHoatChat;
      warnings.push({
        ingredientId,
        type: LoaiCanhBaoDonThuoc.TRUNG_HOAT_CHAT,
        severity: MucDoCanhBao.CAN_THAN,
        title: `Trùng hoạt chất: ${ingredientName ?? 'chưa xác định'}`,
        content: `Các thuốc ${medicines.map((item) => item.medicineName).join(', ')} có cùng hoạt chất.`,
        recommendation:
          'Kiểm tra nguy cơ dùng trùng và điều chỉnh đơn nếu cần.',
        evidence: { medicineIds: medicines.map((item) => item.medicineId) },
      });
    }

    // Một thuốc có thể có dữ liệu hoạt chất lặp từ lịch sử nhập kho.
    // Chỉ tạo một cảnh báo cho cùng loại cảnh báo/thuốc/hoạt chất.
    const uniqueWarnings = Array.from(
      new Map(
        warnings.map((warning) => [
          `${warning.type}:${warning.medicineId ?? ''}:${warning.ingredientId ?? ''}`,
          warning,
        ]),
      ).values(),
    );

    await this.prisma.$transaction(async (transaction) => {
      await transaction.canhBaoDonThuoc.deleteMany({
        where: {
          donThuocId: prescription.id,
          nguonCanhBao: NguonCanhBao.QUY_TAC_HE_THONG,
          trangThaiXuLy: TrangThaiXuLyCanhBao.CHO_XU_LY,
        },
      });
      if (uniqueWarnings.length) {
        await transaction.canhBaoDonThuoc.createMany({
          data: uniqueWarnings.map((warning) => ({
            donThuocId: prescription.id,
            thuocId: warning.medicineId,
            hoatChatId: warning.ingredientId,
            loaiCanhBao: warning.type,
            mucDo: warning.severity,
            nguonCanhBao: NguonCanhBao.QUY_TAC_HE_THONG,
            tieuDe: warning.title,
            noiDung: warning.content,
            khuyenNghi: warning.recommendation,
            duLieuBangChung: warning.evidence as never,
          })),
        });
      }
    });

    const result = await this.findWarnings(prescription.id);
    const criticalCount = result.filter(
      (item) =>
        item.severity === MucDoCanhBao.NGHIEM_TRONG &&
        item.status === TrangThaiXuLyCanhBao.CHO_XU_LY,
    ).length;
    if (criticalCount && prescription.hoSoKham.luotKham.bacSi?.nguoiDungId) {
      // Không chặn phản hồi lưu nháp: bác sĩ nhận cảnh báo ngay từ dữ liệu trả về.
      void this.thongBaoService
        .notifyUsers([prescription.hoSoKham.luotKham.bacSi.nguoiDungId], {
          title: 'Cảnh báo đơn thuốc cần xử lý',
          content: `Đơn ${prescription.maDonThuoc} có ${criticalCount} cảnh báo nghiêm trọng.`,
          type: 'CANH_BAO_DON_THUOC',
          link: `/bac-si/kham-benh?luotKhamId=${prescription.hoSoKham.luotKhamId}`,
        })
        .catch(() => undefined);
      this.realtimeService.emitToRoom(
        REALTIME_ROOMS.doctor(prescription.hoSoKham.luotKham.bacSi.id),
        REALTIME_EVENTS.PRESCRIPTION_WARNING_CREATED,
        { prescriptionId: prescription.id, warningCount: criticalCount },
      );
    }
    return result;
  }

  async findWarnings(prescriptionId: number) {
    const warnings = await this.prisma.canhBaoDonThuoc.findMany({
      where: { donThuocId: prescriptionId },
      include: {
        thuoc: { select: { id: true, tenThuoc: true } },
        hoatChat: { select: { id: true, tenHoatChat: true } },
      },
      orderBy: [{ mucDo: 'desc' }, { createdAt: 'desc' }],
    });

    return warnings.map((item) => {
      const evidence =
        item.duLieuBangChung &&
        typeof item.duLieuBangChung === 'object' &&
        !Array.isArray(item.duLieuBangChung)
          ? (item.duLieuBangChung as Record<string, unknown>)
          : {};
      return {
          id: item.id,
          type: item.loaiCanhBao,
          severity: item.mucDo,
          source: item.nguonCanhBao,
          title: item.tieuDe,
          content: item.noiDung,
          recommendation: item.khuyenNghi,
          medicineName: item.thuoc?.tenThuoc ?? null,
          ingredientName: item.hoatChat?.tenHoatChat ?? null,
          allergyName:
            typeof evidence.allergyName === 'string'
              ? evidence.allergyName
              : null,
          allergyReaction:
            typeof evidence.reaction === 'string' ? evidence.reaction : null,
          conflictingIngredientName:
            typeof evidence.conflictingIngredient === 'string'
              ? evidence.conflictingIngredient
              : item.hoatChat?.tenHoatChat ?? null,
          status: item.trangThaiXuLy,
          reason: item.lyDoXuLy,
          createdAt: item.createdAt,
        };
    });
  }

  async findWarningsForVisit(userId: number, visitId: number) {
    const doctor = await this.prisma.bacSi.findUnique({
      where: { nguoiDungId: userId },
      select: { id: true },
    });
    const visit = await this.prisma.luotKham.findUnique({
      where: { id: visitId },
      select: {
        bacSiId: true,
        hoSoKham: { select: { donThuoc: { select: { id: true } } } },
      },
    });
    if (!doctor || !visit || visit.bacSiId !== doctor.id)
      throw new ForbiddenException(
        'Bạn không có quyền xem cảnh báo của lượt khám này',
      );
    return visit.hoSoKham?.donThuoc
      ? this.findWarnings(visit.hoSoKham.donThuoc.id)
      : [];
  }

  async resolveWarning(
    userId: number,
    warningId: number,
    dto: ResolvePrescriptionWarningDto,
  ) {
    const warning = await this.prisma.canhBaoDonThuoc.findUnique({
      where: { id: warningId },
      include: {
        donThuoc: {
          include: {
            hoSoKham: {
              include: {
                luotKham: {
                  select: { bacSi: { select: { nguoiDungId: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!warning)
      throw new NotFoundException('Không tìm thấy cảnh báo đơn thuốc');
    if (warning.donThuoc.hoSoKham.luotKham.bacSi?.nguoiDungId !== userId)
      throw new ForbiddenException('Bạn không có quyền xử lý cảnh báo này');
    if (
      warning.mucDo === MucDoCanhBao.NGHIEM_TRONG &&
      dto.status === TrangThaiXuLyCanhBao.DA_BO_QUA &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException(
        'Cần nêu lý do khi bỏ qua cảnh báo nghiêm trọng',
      );
    }
    const updated = await this.prisma.canhBaoDonThuoc.update({
      where: { id: warning.id },
      data: {
        trangThaiXuLy: dto.status,
        nguoiXuLyId: userId,
        lyDoXuLy: dto.reason?.trim() || null,
        thoiGianXuLy: new Date(),
      },
    });
    await this.auditLogsService.record(
      userId,
      PhanHeNhatKyHeThong.THUOC,
      'Xử lý cảnh báo đơn thuốc',
      `${warning.tieuDe}: ${dto.status}`,
    );
    return updated;
  }

  async ensureNoPendingCriticalWarning(prescriptionId: number) {
    const count = await this.prisma.canhBaoDonThuoc.count({
      where: {
        donThuocId: prescriptionId,
        mucDo: MucDoCanhBao.NGHIEM_TRONG,
        trangThaiXuLy: TrangThaiXuLyCanhBao.CHO_XU_LY,
      },
    });
    if (count)
      throw new BadRequestException(
        'Đơn thuốc còn cảnh báo nghiêm trọng chưa xử lý. Hãy lưu nháp và xác nhận hoặc bỏ qua có lý do.',
      );
  }
}
