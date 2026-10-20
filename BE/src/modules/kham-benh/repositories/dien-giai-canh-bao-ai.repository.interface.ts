import type { Prisma } from '@prisma/client';

export type DuLieuCanhBaoCanDienGiai = {
  canhBao: {
    id: number;
    loai: string;
    mucDo: string;
    tieuDe: string;
    noiDung: string;
    khuyenNghi: string | null;
    thuocId: number | null;
    hoatChatId: number | null;
    tenThuoc: string | null;
    tenHoatChat: string | null;
  };
  luotKham: {
    id: number;
    benhNhanId: number;
    bacSiNguoiDungId: number | null;
    lyDoKham: string | null;
    maChuyenKhoa: string;
    tenChuyenKhoa: string;
    chanDoan: string | null;
    maIcd10: string | null;
    duLieuChuyenKhoa: Record<string, unknown> | null;
    diUng: Array<{
      thuocId: number | null;
      hoatChatId: number | null;
      tacNhan: string;
      phanUng: string | null;
    }>;
  };
};

export interface DienGiaiCanhBaoAiRepository {
  findWarningContext(
    visitId: number,
    warningId: number,
  ): Promise<DuLieuCanhBaoCanDienGiai | null>;
  createRun(input: {
    patientId: number;
    model: string;
    metadata: Prisma.InputJsonValue;
  }): Promise<{ id: number }>;
  markRunSuccess(
    runId: number,
    data: {
      inputTokens: number | null;
      outputTokens: number | null;
      latencyMs: number;
    },
  ): Promise<void>;
  markRunFailure(runId: number, message: string): Promise<void>;
}

export const DIEN_GIAI_CANH_BAO_AI_REPOSITORY = Symbol(
  'DIEN_GIAI_CANH_BAO_AI_REPOSITORY',
);
