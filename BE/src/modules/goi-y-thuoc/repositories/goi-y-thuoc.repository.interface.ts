import type { Prisma } from '@prisma/client';

export const ungVienThuocInclude = {
  thuocThayThe: {
    select: {
      id: true,
      maThuoc: true,
      tenThuoc: true,
      donViTinh: true,
      trangThai: true,
      hoatChatCauThanh: {
        select: { hoatChat: { select: { id: true, tenHoatChat: true } } },
      },
      loThuoc: {
        select: {
          soLuongConLai: true,
          hanDung: true,
          trangThai: true,
        },
      },
    },
  },
} satisfies Prisma.GoiYThuocThayTheInclude;

export type UngVienThuocWithRelations = Prisma.GoiYThuocThayTheGetPayload<{
  include: typeof ungVienThuocInclude;
}>;

export interface GoiYThuocRepository {
  // Chỉ đọc ứng viên hệ thống còn hiệu lực; không cung cấp CRUD nghiệp vụ cho Trưởng khoa.
  findAllowedAlternatives(input: {
    medicineId?: number | null;
    ingredientId?: number | null;
    at: Date;
  }): Promise<UngVienThuocWithRelations[]>;
}

export const GOI_Y_THUOC_REPOSITORY = Symbol('GOI_Y_THUOC_REPOSITORY');
