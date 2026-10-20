-- Bổ sung phân hệ nhật ký cho đăng ký, duyệt và phân công ca.
ALTER TYPE "phan_he_nhat_ky_he_thong" ADD VALUE IF NOT EXISTS 'CA_LAM_VIEC';

-- Vòng đời và nguồn tạo phân công ca.
CREATE TYPE "nguon_phan_cong_ca" AS ENUM (
    'TU_DANG_KY',
    'QUAN_LY_PHAN_CONG',
    'CHUYEN_DOI_DU_LIEU'
);

CREATE TYPE "trang_thai_phan_cong_ca" AS ENUM (
    'CHO_DUYET',
    'DA_DUYET',
    'TU_CHOI',
    'DA_HUY',
    'DA_HOAN_THANH'
);

CREATE TYPE "trang_thai_ban_giao_ca" AS ENUM (
    'BAN_NHAP',
    'CHO_XAC_NHAN',
    'DA_BAN_GIAO'
);

-- Danh mục ca dùng chung cho toàn bộ nhân sự phòng khám.
CREATE TABLE "ca_lam_viec" (
    "id" SERIAL NOT NULL,
    "ma_ca" VARCHAR(30) NOT NULL,
    "ten_ca" VARCHAR(100) NOT NULL,
    "gio_bat_dau" TIME(0) NOT NULL,
    "gio_ket_thuc" TIME(0) NOT NULL,
    "qua_ngay" BOOLEAN NOT NULL DEFAULT false,
    "mo_ta" TEXT,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ca_lam_viec_pkey" PRIMARY KEY ("id")
);

-- Một bản ghi vừa biểu diễn đăng ký ca của nhân sự, vừa biểu diễn phân công đã duyệt.
CREATE TABLE "phan_cong_ca" (
    "id" SERIAL NOT NULL,
    "nguoi_dung_id" INTEGER NOT NULL,
    "vai_tro_id" INTEGER NOT NULL,
    "ca_lam_viec_id" INTEGER NOT NULL,
    "ngay_lam_viec" DATE NOT NULL,
    "chuyen_khoa_id" INTEGER,
    "phong_kham_id" INTEGER,
    "nguon" "nguon_phan_cong_ca" NOT NULL DEFAULT 'TU_DANG_KY',
    "trang_thai" "trang_thai_phan_cong_ca" NOT NULL DEFAULT 'CHO_DUYET',
    "nguoi_phan_cong_id" INTEGER,
    "nguoi_duyet_id" INTEGER,
    "thoi_gian_duyet" TIMESTAMP(3),
    "ly_do_tu_choi" TEXT,
    "ghi_chu" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phan_cong_ca_pkey" PRIMARY KEY ("id")
);

-- Báo cáo kết ca và bàn giao được liên kết một-một với ca đã phân công.
CREATE TABLE "ban_giao_ca" (
    "id" SERIAL NOT NULL,
    "phan_cong_ca_id" INTEGER NOT NULL,
    "nguoi_ban_giao_id" INTEGER NOT NULL,
    "nguoi_nhan_ban_giao_id" INTEGER,
    "thoi_gian_bat_dau_thuc_te" TIMESTAMP(3),
    "thoi_gian_ket_thuc_thuc_te" TIMESTAMP(3),
    "tong_doanh_thu" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "so_benh_nhan_tiep_nhan" INTEGER NOT NULL DEFAULT 0,
    "so_phieu_cho_xu_ly" INTEGER NOT NULL DEFAULT 0,
    "checklist" JSONB,
    "ghi_chu" TEXT,
    "trang_thai" "trang_thai_ban_giao_ca" NOT NULL DEFAULT 'BAN_NHAP',
    "thoi_gian_ban_giao" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ban_giao_ca_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ca_lam_viec_ma_ca_key"
ON "ca_lam_viec"("ma_ca");

CREATE UNIQUE INDEX "ca_lam_viec_gio_bat_dau_gio_ket_thuc_key"
ON "ca_lam_viec"("gio_bat_dau", "gio_ket_thuc");

CREATE INDEX "ca_lam_viec_trang_thai_idx"
ON "ca_lam_viec"("trang_thai");

CREATE UNIQUE INDEX "phan_cong_ca_nguoi_dung_id_ca_lam_viec_id_ngay_lam_viec_key"
ON "phan_cong_ca"("nguoi_dung_id", "ca_lam_viec_id", "ngay_lam_viec");

CREATE UNIQUE INDEX "phan_cong_ca_phong_kham_id_ca_lam_viec_id_ngay_lam_viec_key"
ON "phan_cong_ca"("phong_kham_id", "ca_lam_viec_id", "ngay_lam_viec");

CREATE INDEX "phan_cong_ca_vai_tro_id_idx"
ON "phan_cong_ca"("vai_tro_id");

CREATE INDEX "phan_cong_ca_ca_lam_viec_id_idx"
ON "phan_cong_ca"("ca_lam_viec_id");

CREATE INDEX "phan_cong_ca_ngay_lam_viec_trang_thai_idx"
ON "phan_cong_ca"("ngay_lam_viec", "trang_thai");

CREATE INDEX "phan_cong_ca_chuyen_khoa_id_idx"
ON "phan_cong_ca"("chuyen_khoa_id");

CREATE INDEX "phan_cong_ca_phong_kham_id_idx"
ON "phan_cong_ca"("phong_kham_id");

CREATE INDEX "phan_cong_ca_nguoi_phan_cong_id_idx"
ON "phan_cong_ca"("nguoi_phan_cong_id");

CREATE INDEX "phan_cong_ca_nguoi_duyet_id_idx"
ON "phan_cong_ca"("nguoi_duyet_id");

CREATE UNIQUE INDEX "ban_giao_ca_phan_cong_ca_id_key"
ON "ban_giao_ca"("phan_cong_ca_id");

CREATE INDEX "ban_giao_ca_nguoi_ban_giao_id_idx"
ON "ban_giao_ca"("nguoi_ban_giao_id");

CREATE INDEX "ban_giao_ca_nguoi_nhan_ban_giao_id_idx"
ON "ban_giao_ca"("nguoi_nhan_ban_giao_id");

CREATE INDEX "ban_giao_ca_trang_thai_idx"
ON "ban_giao_ca"("trang_thai");

ALTER TABLE "phan_cong_ca"
ADD CONSTRAINT "phan_cong_ca_nguoi_dung_id_fkey"
FOREIGN KEY ("nguoi_dung_id") REFERENCES "nguoi_dung"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "phan_cong_ca"
ADD CONSTRAINT "phan_cong_ca_vai_tro_id_fkey"
FOREIGN KEY ("vai_tro_id") REFERENCES "vai_tro"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "phan_cong_ca"
ADD CONSTRAINT "phan_cong_ca_ca_lam_viec_id_fkey"
FOREIGN KEY ("ca_lam_viec_id") REFERENCES "ca_lam_viec"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "phan_cong_ca"
ADD CONSTRAINT "phan_cong_ca_chuyen_khoa_id_fkey"
FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "phan_cong_ca"
ADD CONSTRAINT "phan_cong_ca_phong_kham_id_fkey"
FOREIGN KEY ("phong_kham_id") REFERENCES "phong_kham"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "phan_cong_ca"
ADD CONSTRAINT "phan_cong_ca_nguoi_phan_cong_id_fkey"
FOREIGN KEY ("nguoi_phan_cong_id") REFERENCES "nguoi_dung"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "phan_cong_ca"
ADD CONSTRAINT "phan_cong_ca_nguoi_duyet_id_fkey"
FOREIGN KEY ("nguoi_duyet_id") REFERENCES "nguoi_dung"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ban_giao_ca"
ADD CONSTRAINT "ban_giao_ca_phan_cong_ca_id_fkey"
FOREIGN KEY ("phan_cong_ca_id") REFERENCES "phan_cong_ca"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ban_giao_ca"
ADD CONSTRAINT "ban_giao_ca_nguoi_ban_giao_id_fkey"
FOREIGN KEY ("nguoi_ban_giao_id") REFERENCES "nguoi_dung"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ban_giao_ca"
ADD CONSTRAINT "ban_giao_ca_nguoi_nhan_ban_giao_id_fkey"
FOREIGN KEY ("nguoi_nhan_ban_giao_id") REFERENCES "nguoi_dung"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ca chuẩn là dữ liệu cấu hình vận hành, không phải dữ liệu giao diện mẫu.
INSERT INTO "ca_lam_viec" (
    "ma_ca",
    "ten_ca",
    "gio_bat_dau",
    "gio_ket_thuc",
    "qua_ngay",
    "mo_ta",
    "updated_at"
)
VALUES
    ('CA_SANG', 'Ca sáng', TIME '08:00:00', TIME '12:00:00', false, 'Ca làm việc buổi sáng', CURRENT_TIMESTAMP),
    ('CA_CHIEU', 'Ca chiều', TIME '13:00:00', TIME '17:00:00', false, 'Ca làm việc buổi chiều', CURRENT_TIMESTAMP),
    ('CA_TOI', 'Ca tối', TIME '17:00:00', TIME '21:00:00', false, 'Ca làm việc buổi tối', CURRENT_TIMESTAMP)
ON CONFLICT ("ma_ca") DO NOTHING;

-- Bảo đảm vai trò bác sĩ tồn tại trước khi chuyển dữ liệu lịch cũ.
INSERT INTO "vai_tro" (
    "ma_vai_tro",
    "ten_vai_tro",
    "mo_ta",
    "updated_at"
)
VALUES (
    'DOCTOR',
    'Bác sĩ',
    'Bác sĩ khám và điều trị',
    CURRENT_TIMESTAMP
)
ON CONFLICT ("ma_vai_tro") DO NOTHING;

-- Nếu lịch cũ có giờ khác ca chuẩn, tạo một danh mục ca chuyển đổi tương ứng.
INSERT INTO "ca_lam_viec" (
    "ma_ca",
    "ten_ca",
    "gio_bat_dau",
    "gio_ket_thuc",
    "qua_ngay",
    "mo_ta",
    "updated_at"
)
SELECT DISTINCT
    'CD_' ||
        REPLACE(TO_CHAR("gio_bat_dau", 'HH24MI'), ':', '') ||
        '_' ||
        REPLACE(TO_CHAR("gio_ket_thuc", 'HH24MI'), ':', ''),
    'Ca chuyển đổi ' ||
        TO_CHAR("gio_bat_dau", 'HH24:MI') ||
        ' - ' ||
        TO_CHAR("gio_ket_thuc", 'HH24:MI'),
    "gio_bat_dau",
    "gio_ket_thuc",
    "gio_ket_thuc" <= "gio_bat_dau",
    'Tự động tạo khi chuyển lịch làm việc bác sĩ cũ',
    CURRENT_TIMESTAMP
FROM "lich_lam_viec_bac_si"
ON CONFLICT ("gio_bat_dau", "gio_ket_thuc") DO NOTHING;

-- Chuyển toàn bộ lịch bác sĩ cũ sang phân công ca dùng chung.
INSERT INTO "phan_cong_ca" (
    "nguoi_dung_id",
    "vai_tro_id",
    "ca_lam_viec_id",
    "ngay_lam_viec",
    "chuyen_khoa_id",
    "phong_kham_id",
    "nguon",
    "trang_thai",
    "thoi_gian_duyet",
    "ghi_chu",
    "created_at",
    "updated_at"
)
SELECT
    "bac_si"."nguoi_dung_id",
    "vai_tro"."id",
    "ca_lam_viec"."id",
    "lich_cu"."ngay_lam_viec",
    "bac_si"."chuyen_khoa_id",
    "lich_cu"."phong_kham_id",
    'CHUYEN_DOI_DU_LIEU'::"nguon_phan_cong_ca",
    CASE
        WHEN "lich_cu"."trang_thai" = 'DANG_HOAT_DONG'
            THEN 'DA_DUYET'::"trang_thai_phan_cong_ca"
        ELSE 'DA_HUY'::"trang_thai_phan_cong_ca"
    END,
    CASE
        WHEN "lich_cu"."trang_thai" = 'DANG_HOAT_DONG'
            THEN "lich_cu"."created_at"
        ELSE NULL
    END,
    'Chuyển từ lịch làm việc bác sĩ cũ #' || "lich_cu"."id",
    "lich_cu"."created_at",
    "lich_cu"."updated_at"
FROM "lich_lam_viec_bac_si" AS "lich_cu"
INNER JOIN "bac_si"
    ON "bac_si"."id" = "lich_cu"."bac_si_id"
INNER JOIN "vai_tro"
    ON "vai_tro"."ma_vai_tro" = 'DOCTOR'
INNER JOIN "ca_lam_viec"
    ON "ca_lam_viec"."gio_bat_dau" = "lich_cu"."gio_bat_dau"
   AND "ca_lam_viec"."gio_ket_thuc" = "lich_cu"."gio_ket_thuc";

-- Chỉ bỏ bảng cũ sau khi dữ liệu đã được chuyển trong cùng transaction migration.
DROP TABLE "lich_lam_viec_bac_si";
