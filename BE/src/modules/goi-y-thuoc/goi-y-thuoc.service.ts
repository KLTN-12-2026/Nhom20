import { Inject, Injectable } from '@nestjs/common';
import { TrangThaiChung } from '@prisma/client';

import {
  GOI_Y_THUOC_REPOSITORY,
  type GoiYThuocRepository,
} from './repositories/goi-y-thuoc.repository.interface';

export type UngVienThuocThayThe = {
  suggestionId: number;
  medicineId: number;
  medicineCode: string;
  medicineName: string;
  unit: string;
  activeIngredients: string[];
  availableQuantity: number;
  professionalNote: string | null;
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .trim();
}

@Injectable()
export class GoiYThuocService {
  constructor(
    @Inject(GOI_Y_THUOC_REPOSITORY)
    private readonly repository: GoiYThuocRepository,
  ) {}

  // Lấy ứng viên từ nguồn hệ thống rồi loại thuốc dị ứng, hết hạn, hết tồn hoặc ngừng hoạt động.
  async findAllowedAlternatives(input: {
    medicineId?: number | null;
    ingredientId?: number | null;
    patientAllergies?: Array<{
      medicineId?: number | null;
      ingredientId?: number | null;
      agent: string;
    }>;
  }): Promise<UngVienThuocThayThe[]> {
    const now = new Date();
    const candidates = await this.repository.findAllowedAlternatives({
      medicineId: input.medicineId,
      ingredientId: input.ingredientId,
      at: now,
    });
    const allergyMedicineIds = new Set(
      input.patientAllergies?.flatMap((item) =>
        item.medicineId ? [item.medicineId] : [],
      ) ?? [],
    );
    const allergyIngredientIds = new Set(
      input.patientAllergies?.flatMap((item) =>
        item.ingredientId ? [item.ingredientId] : [],
      ) ?? [],
    );
    const allergyTexts = (input.patientAllergies ?? [])
      .map((item) => normalizeText(item.agent))
      .filter((item) => item.length >= 4);

    const allowed = candidates
      .filter((item) => {
        const medicine = item.thuocThayThe;
        if (medicine.trangThai !== TrangThaiChung.DANG_HOAT_DONG) return false;
        if (allergyMedicineIds.has(medicine.id)) return false;
        const ingredientNames = medicine.hoatChatCauThanh.map(
          (link) => link.hoatChat.tenHoatChat,
        );
        if (
          medicine.hoatChatCauThanh.some((link) =>
            allergyIngredientIds.has(link.hoatChat.id),
          )
        ) {
          return false;
        }
        const searchable = [medicine.tenThuoc, ...ingredientNames]
          .map(normalizeText)
          .join(' ');
        if (allergyTexts.some((allergy) => searchable.includes(allergy))) {
          return false;
        }
        return medicine.loThuoc.some(
          (lot) =>
            lot.trangThai === TrangThaiChung.DANG_HOAT_DONG &&
            lot.hanDung >= now &&
            lot.soLuongConLai > 0,
        );
      })
      .map((item) => {
        const validLots = item.thuocThayThe.loThuoc.filter(
          (lot) =>
            lot.trangThai === TrangThaiChung.DANG_HOAT_DONG &&
            lot.hanDung >= now &&
            lot.soLuongConLai > 0,
        );
        return {
          suggestionId: item.id,
          medicineId: item.thuocThayThe.id,
          medicineCode: item.thuocThayThe.maThuoc,
          medicineName: item.thuocThayThe.tenThuoc,
          unit: item.thuocThayThe.donViTinh,
          activeIngredients: item.thuocThayThe.hoatChatCauThanh.map(
            (link) => link.hoatChat.tenHoatChat,
          ),
          availableQuantity: validLots.reduce(
            (sum, lot) => sum + lot.soLuongConLai,
            0,
          ),
          professionalNote: item.ghiChuChuyenMon,
        };
      });

    // Một thuốc chỉ xuất hiện một lần dù nguồn hệ thống có nhiều điều kiện tránh trùng nhau.
    return [
      ...new Map(allowed.map((item) => [item.medicineId, item])).values(),
    ];
  }
}
