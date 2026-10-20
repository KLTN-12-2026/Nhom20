import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LoaiCanhBaoDonThuoc, type Prisma } from '@prisma/client';

import { GeminiService } from '../../integrations/gemini/gemini.service';
import {
  GoiYThuocService,
  type UngVienThuocThayThe,
} from '../goi-y-thuoc/goi-y-thuoc.service';
import {
  DIEN_GIAI_CANH_BAO_AI_REPOSITORY,
  type DienGiaiCanhBaoAiRepository,
} from './repositories/dien-giai-canh-bao-ai.repository.interface';

type GoiYThuocAi = UngVienThuocThayThe & {
  rank: number;
  reason: string;
};

@Injectable()
export class GoiYThuocAiService {
  constructor(
    @Inject(DIEN_GIAI_CANH_BAO_AI_REPOSITORY)
    private readonly repository: DienGiaiCanhBaoAiRepository,
    private readonly goiYThuocService: GoiYThuocService,
    private readonly geminiService: GeminiService,
  ) {}

  // Xếp hạng tối đa ba thuốc từ danh sách Backend cho phép; AI không được thay đổi đơn thuốc.
  async suggest(userId: number, visitId: number, warningId: number) {
    const context = await this.repository.findWarningContext(
      visitId,
      warningId,
    );
    if (!context) {
      throw new NotFoundException(
        'Không tìm thấy cảnh báo thuộc lượt khám này',
      );
    }
    if (context.luotKham.bacSiNguoiDungId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem gợi ý thuốc cho lượt khám này',
      );
    }
    if (context.canhBao.loai !== LoaiCanhBaoDonThuoc.DI_UNG_THUOC) {
      throw new BadRequestException(
        'Gợi ý AI chỉ áp dụng cho cảnh báo dị ứng thuốc',
      );
    }

    // Rule-based lọc dị ứng, hoạt chất, trạng thái, hạn dùng và tồn kho trước khi gọi Gemini.
    const allowedCandidates =
      await this.goiYThuocService.findAllowedAlternatives({
        medicineId: context.canhBao.thuocId,
        ingredientId: context.canhBao.hoatChatId,
        patientAllergies: context.luotKham.diUng.map((allergy) => ({
          medicineId: allergy.thuocId,
          ingredientId: allergy.hoatChatId,
          agent: allergy.tacNhan,
        })),
      });

    if (!allowedCandidates.length) {
      return {
        message: 'Chưa tìm thấy thuốc thay thế phù hợp trong dữ liệu hệ thống.',
        data: {
          source: 'HE_THONG',
          status: 'NO_CANDIDATE',
          warningId,
          suggestions: [] as GoiYThuocAi[],
          notice: 'Chưa tìm thấy thuốc thay thế phù hợp trong dữ liệu hệ thống.',
        },
      };
    }

    const safePayload = {
      warning: {
        type: context.canhBao.loai,
        severity: context.canhBao.mucDo,
        title: context.canhBao.tieuDe,
        content: context.canhBao.noiDung,
        recommendation: context.canhBao.khuyenNghi,
      },
      reasonForVisit: context.luotKham.lyDoKham,
      currentMedicine: {
        medicineId: context.canhBao.thuocId,
        medicineName: context.canhBao.tenThuoc,
        conflictingIngredientId: context.canhBao.hoatChatId,
        conflictingIngredientName: context.canhBao.tenHoatChat,
      },
      specialty: {
        code: context.luotKham.maChuyenKhoa,
        name: context.luotKham.tenChuyenKhoa,
      },
      diagnosis: context.luotKham.chanDoan,
      icd10: context.luotKham.maIcd10,
      specialtyData: context.luotKham.duLieuChuyenKhoa,
      allergies: context.luotKham.diUng.map((allergy) => ({
        agent: allergy.tacNhan,
        reaction: allergy.phanUng,
      })),
      allowedCandidates,
    };
    const run = await this.repository.createRun({
      patientId: context.luotKham.benhNhanId,
      model: this.geminiService.getModelName(),
      metadata: safePayload as Prisma.InputJsonValue,
    });

    try {
      // Gemini chỉ nhận context đã lọc và phải trả về đúng ID thuốc trong allowedCandidates.
      const response = await this.geminiService.chat({
        systemPrompt: [
          'Bạn là trợ lý hỗ trợ bác sĩ xếp hạng thuốc thay thế.',
          'Hãy phân tích cảnh báo, chuyên khoa, chẩn đoán, dữ liệu khám chuyên khoa và dị ứng.',
          'Chỉ chọn từ 1 đến 3 medicineId có trong allowedCandidates.',
          'Không tạo thuốc mới, không kê đơn, không tự thay thuốc và không đưa liều hoặc số ngày dùng.',
          'Mỗi lý do bằng tiếng Việt, ngắn gọn, tối đa 160 ký tự.',
          'Chỉ trả JSON thuần theo mẫu: {"suggestions":[{"medicineId":1,"reason":"Lý do ngắn"}]}.',
        ].join(' '),
        history: [],
        userMessage: JSON.stringify(safePayload),
      });
      const suggestions = this.parseGeminiSuggestions(
        response.text,
        allowedCandidates,
      );
      await this.repository.markRunSuccess(run.id, response);
      return {
        message: 'Đã xếp hạng thuốc thay thế bằng AI',
        data: {
          source: 'GEMINI',
          status: 'SUCCESS',
          warningId,
          suggestions,
          notice: 'Thông tin tham khảo cho bác sĩ.',
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GEMINI_ERROR';
      // Khi Gemini lỗi, giữ nguyên cảnh báo dị ứng và không giả kết quả thay thế.
      await this.repository.markRunFailure(run.id, message);
      throw new ServiceUnavailableException(
        'Không thể tải gợi ý AI lúc này. Cảnh báo dị ứng vẫn có hiệu lực.',
      );
    }
  }

  // Chỉ ánh xạ kết quả Gemini về thuốc thật do Backend cung cấp, loại mọi ID lạ hoặc trùng.
  private parseGeminiSuggestions(
    text: string,
    allowedCandidates: UngVienThuocThayThe[],
  ): GoiYThuocAi[] {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new Error('GEMINI_RESPONSE_INVALID_JSON');
    }
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      suggestions?: unknown;
    };
    if (!Array.isArray(parsed.suggestions)) {
      throw new Error('GEMINI_RESPONSE_MISSING_SUGGESTIONS');
    }

    const allowedById = new Map(
      allowedCandidates.map((candidate) => [candidate.medicineId, candidate]),
    );
    const usedIds = new Set<number>();
    const suggestions: GoiYThuocAi[] = [];

    for (const rawItem of parsed.suggestions) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as Record<string, unknown>;
      const medicineId = Number(item.medicineId);
      const candidate = allowedById.get(medicineId);
      if (!candidate || usedIds.has(medicineId)) continue;
      const reason =
        typeof item.reason === 'string' ? item.reason.trim().slice(0, 160) : '';
      if (!reason) continue;
      usedIds.add(medicineId);
      suggestions.push({ ...candidate, rank: suggestions.length + 1, reason });
      if (suggestions.length === 3) break;
    }

    if (!suggestions.length) {
      throw new Error('GEMINI_RESPONSE_HAS_NO_ALLOWED_MEDICINE');
    }
    return suggestions;
  }

}
