CREATE TYPE "muc_do_uu_tien_tiep_don" AS ENUM (
  'THONG_THUONG',
  'TRE_EM',
  'NGUOI_CAO_TUOI',
  'MANG_THAI',
  'KHAN_CAP'
);

ALTER TABLE "benh_nhan"
ADD COLUMN "ma_the_bao_hiem_y_te" VARCHAR(30);

ALTER TABLE "luot_kham"
ADD COLUMN "muc_do_uu_tien" "muc_do_uu_tien_tiep_don"
NOT NULL DEFAULT 'THONG_THUONG';
