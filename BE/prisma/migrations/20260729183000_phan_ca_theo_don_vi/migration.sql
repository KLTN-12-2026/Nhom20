-- Đổi nguồn phân công để thể hiện đúng người sắp lịch là trưởng đơn vị.
ALTER TYPE "nguon_phan_cong_ca"
RENAME VALUE 'QUAN_LY_PHAN_CONG' TO 'TRUONG_DON_VI_PHAN_CONG';

CREATE TYPE "loai_don_vi_lam_viec" AS ENUM (
    'CHUYEN_KHOA',
    'BO_PHAN'
);

CREATE TYPE "chuc_vu_quan_ly_don_vi" AS ENUM (
    'TRUONG_DON_VI',
    'PHO_DON_VI'
);

-- Đơn vị làm việc bao gồm chuyên khoa khám và các bộ phận vận hành.
CREATE TABLE "don_vi_lam_viec" (
    "id" SERIAL NOT NULL,
    "ma_don_vi" VARCHAR(50) NOT NULL,
    "ten_don_vi" VARCHAR(150) NOT NULL,
    "loai_don_vi" "loai_don_vi_lam_viec" NOT NULL,
    "chuyen_khoa_id" INTEGER,
    "mo_ta" TEXT,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "don_vi_lam_viec_pkey" PRIMARY KEY ("id")
);

-- Lưu lịch sử trưởng/phó đơn vị để giới hạn phạm vi duyệt và sắp ca.
CREATE TABLE "quan_ly_don_vi" (
    "id" SERIAL NOT NULL,
    "don_vi_lam_viec_id" INTEGER NOT NULL,
    "nguoi_dung_id" INTEGER NOT NULL,
    "chuc_vu" "chuc_vu_quan_ly_don_vi" NOT NULL DEFAULT 'TRUONG_DON_VI',
    "ngay_bat_dau" DATE NOT NULL,
    "ngay_ket_thuc" DATE,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "ghi_chu" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quan_ly_don_vi_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "don_vi_lam_viec_ma_don_vi_key"
ON "don_vi_lam_viec"("ma_don_vi");

CREATE UNIQUE INDEX "don_vi_lam_viec_chuyen_khoa_id_key"
ON "don_vi_lam_viec"("chuyen_khoa_id");

CREATE INDEX "don_vi_lam_viec_loai_don_vi_trang_thai_idx"
ON "don_vi_lam_viec"("loai_don_vi", "trang_thai");

CREATE UNIQUE INDEX "quan_ly_don_vi_don_vi_lam_viec_id_nguoi_dung_id_chuc_vu_ngay_bat_dau_key"
ON "quan_ly_don_vi"(
    "don_vi_lam_viec_id",
    "nguoi_dung_id",
    "chuc_vu",
    "ngay_bat_dau"
);

CREATE INDEX "quan_ly_don_vi_nguoi_dung_id_idx"
ON "quan_ly_don_vi"("nguoi_dung_id");

CREATE INDEX "quan_ly_don_vi_don_vi_lam_viec_id_trang_thai_idx"
ON "quan_ly_don_vi"("don_vi_lam_viec_id", "trang_thai");

ALTER TABLE "don_vi_lam_viec"
ADD CONSTRAINT "don_vi_lam_viec_chuyen_khoa_id_fkey"
FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quan_ly_don_vi"
ADD CONSTRAINT "quan_ly_don_vi_don_vi_lam_viec_id_fkey"
FOREIGN KEY ("don_vi_lam_viec_id") REFERENCES "don_vi_lam_viec"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quan_ly_don_vi"
ADD CONSTRAINT "quan_ly_don_vi_nguoi_dung_id_fkey"
FOREIGN KEY ("nguoi_dung_id") REFERENCES "nguoi_dung"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Mỗi chuyên khoa hiện có trở thành một đơn vị làm việc độc lập.
INSERT INTO "don_vi_lam_viec" (
    "ma_don_vi",
    "ten_don_vi",
    "loai_don_vi",
    "chuyen_khoa_id",
    "mo_ta",
    "trang_thai",
    "updated_at"
)
SELECT
    'DV_' || "ma_chuyen_khoa",
    "ten_chuyen_khoa",
    'CHUYEN_KHOA'::"loai_don_vi_lam_viec",
    "id",
    'Đơn vị làm việc của chuyên khoa ' || "ten_chuyen_khoa",
    "trang_thai",
    CURRENT_TIMESTAMP
FROM "chuyen_khoa"
ON CONFLICT ("chuyen_khoa_id") DO NOTHING;

-- Các bộ phận vận hành không được lưu giả thành chuyên khoa khám.
INSERT INTO "don_vi_lam_viec" (
    "ma_don_vi",
    "ten_don_vi",
    "loai_don_vi",
    "mo_ta",
    "updated_at"
)
VALUES
    (
        'BO_PHAN_TIEP_DON',
        'Bộ phận Tiếp đón',
        'BO_PHAN',
        'Quản lý lịch làm việc của Lễ tân và Thu ngân',
        CURRENT_TIMESTAMP
    ),
    (
        'BO_PHAN_DUOC',
        'Bộ phận Dược',
        'BO_PHAN',
        'Quản lý lịch làm việc của Dược sĩ',
        CURRENT_TIMESTAMP
    ),
    (
        'BO_PHAN_HO_TRO',
        'Bộ phận Hỗ trợ',
        'BO_PHAN',
        'Quản lý lịch làm việc của nhân viên hỗ trợ',
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("ma_don_vi") DO NOTHING;

-- Liên kết mọi phân công ca với đúng đơn vị phụ trách.
ALTER TABLE "phan_cong_ca"
ADD COLUMN "don_vi_lam_viec_id" INTEGER;

UPDATE "phan_cong_ca" AS "phan_cong"
SET "don_vi_lam_viec_id" = "don_vi"."id"
FROM "don_vi_lam_viec" AS "don_vi"
WHERE "phan_cong"."chuyen_khoa_id" = "don_vi"."chuyen_khoa_id";

UPDATE "phan_cong_ca" AS "phan_cong"
SET "don_vi_lam_viec_id" = "don_vi"."id"
FROM "vai_tro", "don_vi_lam_viec" AS "don_vi"
WHERE "phan_cong"."don_vi_lam_viec_id" IS NULL
  AND "phan_cong"."vai_tro_id" = "vai_tro"."id"
  AND (
      ("vai_tro"."ma_vai_tro" = 'RECEPTIONIST' AND "don_vi"."ma_don_vi" = 'BO_PHAN_TIEP_DON')
      OR
      ("vai_tro"."ma_vai_tro" = 'PHARMACIST' AND "don_vi"."ma_don_vi" = 'BO_PHAN_DUOC')
  );

UPDATE "phan_cong_ca"
SET "don_vi_lam_viec_id" = (
    SELECT "id"
    FROM "don_vi_lam_viec"
    WHERE "ma_don_vi" = 'BO_PHAN_HO_TRO'
)
WHERE "don_vi_lam_viec_id" IS NULL;

ALTER TABLE "phan_cong_ca"
ALTER COLUMN "don_vi_lam_viec_id" SET NOT NULL;

ALTER TABLE "phan_cong_ca"
ADD CONSTRAINT "phan_cong_ca_don_vi_lam_viec_id_fkey"
FOREIGN KEY ("don_vi_lam_viec_id") REFERENCES "don_vi_lam_viec"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "phan_cong_ca_don_vi_lam_viec_id_idx"
ON "phan_cong_ca"("don_vi_lam_viec_id");

-- Trưởng đơn vị sắp xếp ca; đổi tên trường cũ để loại bỏ hàm ý Admin phân công.
ALTER TABLE "phan_cong_ca"
RENAME COLUMN "nguoi_phan_cong_id" TO "nguoi_sap_xep_id";

ALTER TABLE "phan_cong_ca"
RENAME CONSTRAINT "phan_cong_ca_nguoi_phan_cong_id_fkey"
TO "phan_cong_ca_nguoi_sap_xep_id_fkey";

ALTER INDEX "phan_cong_ca_nguoi_phan_cong_id_idx"
RENAME TO "phan_cong_ca_nguoi_sap_xep_id_idx";

-- Không lưu chuyên khoa hai lần; chuyên khoa được suy ra từ đơn vị làm việc.
ALTER TABLE "phan_cong_ca"
DROP CONSTRAINT "phan_cong_ca_chuyen_khoa_id_fkey";

DROP INDEX "phan_cong_ca_chuyen_khoa_id_idx";

ALTER TABLE "phan_cong_ca"
DROP COLUMN "chuyen_khoa_id";
