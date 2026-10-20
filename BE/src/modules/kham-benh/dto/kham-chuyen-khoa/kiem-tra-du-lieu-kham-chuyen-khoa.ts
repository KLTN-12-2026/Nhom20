import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { DuLieuKhamCoXuongKhopDto } from './du-lieu-kham-co-xuong-khop.dto';
import { DuLieuKhamDaLieuDto } from './du-lieu-kham-da-lieu.dto';
import { DuLieuKhamMatDto } from './du-lieu-kham-mat.dto';
import { DuLieuKhamNhiKhoaDto } from './du-lieu-kham-nhi-khoa.dto';
import { DuLieuKhamNoiTongQuatDto } from './du-lieu-kham-noi-tong-quat.dto';
import { DuLieuKhamSanPhuKhoaDto } from './du-lieu-kham-san-phu-khoa.dto';
import { DuLieuKhamTaiMuiHongDto } from './du-lieu-kham-tai-mui-hong.dto';
import { DuLieuKhamTimMachDto } from './du-lieu-kham-tim-mach.dto';

type DuLieuKham = Record<string, string | number | boolean | null>;
type DtoKhamChuyenKhoa = new () => object;

// Map mã khoa thật từ CSDL sang DTO tương ứng, không nhận mã khoa do FE tự gửi.
const DTO_THEO_MA_CHUYEN_KHOA: Record<string, DtoKhamChuyenKhoa> = {
  '101': DuLieuKhamNoiTongQuatDto,
  NOI_TONG_QUAT: DuLieuKhamNoiTongQuatDto,
  '102': DuLieuKhamNhiKhoaDto,
  NHI_KHOA: DuLieuKhamNhiKhoaDto,
  '103': DuLieuKhamDaLieuDto,
  DA_LIEU: DuLieuKhamDaLieuDto,
  '104': DuLieuKhamTimMachDto,
  TIM_MACH: DuLieuKhamTimMachDto,
  '105': DuLieuKhamTaiMuiHongDto,
  TAI_MUI_HONG: DuLieuKhamTaiMuiHongDto,
  '106': DuLieuKhamSanPhuKhoaDto,
  SAN_PHU_KHOA: DuLieuKhamSanPhuKhoaDto,
  '107': DuLieuKhamMatDto,
  MAT: DuLieuKhamMatDto,
  '108': DuLieuKhamCoXuongKhopDto,
  CO_XUONG_KHOP: DuLieuKhamCoXuongKhopDto,
};

// Validate JSONB theo khoa và chặn field lạ trước khi ghi hồ sơ chuyên khoa.
export function kiemTraDuLieuKhamChuyenKhoa(
  maChuyenKhoa: string,
  duLieu?: Record<string, unknown>,
): DuLieuKham | undefined {
  if (duLieu === undefined) return undefined;

  const Dto = DTO_THEO_MA_CHUYEN_KHOA[maChuyenKhoa];
  if (!Dto) {
    throw new BadRequestException('Chuyên khoa của lượt khám chưa được hỗ trợ');
  }

  const instance = plainToInstance(Dto, duLieu, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length) {
    throw new BadRequestException({
      message: 'Dữ liệu khám chuyên khoa không hợp lệ',
      errors: errors.map((error) => ({
        field: error.property,
        constraints: error.constraints,
      })),
    });
  }

  return Object.fromEntries(
    Object.entries(instance as Record<string, unknown>).filter(
      ([, value]) => value !== undefined,
    ),
  ) as DuLieuKham;
}
