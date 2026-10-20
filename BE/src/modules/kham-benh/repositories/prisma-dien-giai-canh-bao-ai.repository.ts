import { Injectable } from '@nestjs/common';
import { LoaiTacVuAI, TrangThaiLanChayAI, type Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type {
  DienGiaiCanhBaoAiRepository,
  DuLieuCanhBaoCanDienGiai,
} from './dien-giai-canh-bao-ai.repository.interface';

@Injectable()
export class PrismaDienGiaiCanhBaoAiRepository implements DienGiaiCanhBaoAiRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Đọc cảnh báo đúng lượt khám để service kiểm tra quyền bác sĩ trước khi gọi AI.
  async findWarningContext(
    visitId: number,
    warningId: number,
  ): Promise<DuLieuCanhBaoCanDienGiai | null> {
    const item = await this.prisma.canhBaoDonThuoc.findFirst({
      where: {
        id: warningId,
        donThuoc: { hoSoKham: { luotKhamId: visitId } },
      },
      include: {
        thuoc: { select: { id: true, tenThuoc: true } },
        hoatChat: { select: { id: true, tenHoatChat: true } },
        donThuoc: {
          include: {
            hoSoKham: {
              include: {
                chiTietChuyenKhoa: { select: { duLieu: true } },
                luotKham: {
                  include: {
                    bacSi: { select: { nguoiDungId: true } },
                    chuyenKhoa: {
                      select: { maChuyenKhoa: true, tenChuyenKhoa: true },
                    },
                    benhNhan: {
                      select: {
                        id: true,
                        diUng: {
                          select: {
                            thuocId: true,
                            hoatChatId: true,
                            tacNhanDiUng: true,
                            phanUng: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!item) return null;

    const hoSoKham = item.donThuoc.hoSoKham;
    const luotKham = hoSoKham.luotKham;
    return {
      canhBao: {
        id: item.id,
        loai: item.loaiCanhBao,
        mucDo: item.mucDo,
        tieuDe: item.tieuDe,
        noiDung: item.noiDung,
        khuyenNghi: item.khuyenNghi,
        thuocId: item.thuocId,
        hoatChatId: item.hoatChatId,
        tenThuoc: item.thuoc?.tenThuoc ?? null,
        tenHoatChat: item.hoatChat?.tenHoatChat ?? null,
      },
      luotKham: {
        id: luotKham.id,
        benhNhanId: luotKham.benhNhan.id,
        bacSiNguoiDungId: luotKham.bacSi?.nguoiDungId ?? null,
        lyDoKham: luotKham.lyDoKham,
        maChuyenKhoa: luotKham.chuyenKhoa.maChuyenKhoa,
        tenChuyenKhoa: luotKham.chuyenKhoa.tenChuyenKhoa,
        chanDoan: hoSoKham.chanDoan,
        maIcd10: hoSoKham.maIcd10,
        duLieuChuyenKhoa:
          (hoSoKham.chiTietChuyenKhoa?.duLieu as Record<
            string,
            unknown
          > | null) ?? null,
        diUng: luotKham.benhNhan.diUng.map((allergy) => ({
          thuocId: allergy.thuocId,
          hoatChatId: allergy.hoatChatId,
          tacNhan: allergy.tacNhanDiUng,
          phanUng: allergy.phanUng,
        })),
      },
    };
  }

  // Lưu nhật ký kỹ thuật mỗi lần Gemini xếp hạng ứng viên để theo dõi lỗi, chi phí và độ trễ.
  async createRun(input: {
    patientId: number;
    model: string;
    metadata: Prisma.InputJsonValue;
  }) {
    return this.prisma.lanChayAI.create({
      data: {
        benhNhanId: input.patientId,
        tacVu: LoaiTacVuAI.CANH_BAO_THUOC,
        tenModel: input.model,
        metadataYeuCau: input.metadata,
      },
      select: { id: true },
    });
  }

  async markRunSuccess(
    runId: number,
    data: {
      inputTokens: number | null;
      outputTokens: number | null;
      latencyMs: number;
    },
  ) {
    await this.prisma.lanChayAI.update({
      where: { id: runId },
      data: {
        trangThai: TrangThaiLanChayAI.THANH_CONG,
        soTokenDauVao: data.inputTokens,
        soTokenDauRa: data.outputTokens,
        doTreMs: data.latencyMs,
      },
    });
  }

  async markRunFailure(runId: number, message: string) {
    await this.prisma.lanChayAI.update({
      where: { id: runId },
      data: {
        trangThai: TrangThaiLanChayAI.THAT_BAI,
        maLoi: 'GEMINI_SUGGEST_FAILED',
        thongBaoLoi: message.slice(0, 1000),
      },
    });
  }
}
