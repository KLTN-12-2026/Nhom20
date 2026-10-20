CREATE TYPE "phan_he_nhat_ky_he_thong" AS ENUM (
  'XAC_THUC',
  'NGUOI_DUNG',
  'BAC_SI',
  'CHUYEN_KHOA',
  'BENH_NHAN',
  'LICH_HEN',
  'THUOC',
  'HE_THONG'
);

CREATE TABLE "nhat_ky_he_thong" (
  "id" SERIAL NOT NULL,
  "nguoi_dung_id" INTEGER,
  "ho_ten" VARCHAR(150) NOT NULL,
  "email" VARCHAR(255),
  "vai_tro" VARCHAR(255) NOT NULL,
  "phan_he" "phan_he_nhat_ky_he_thong" NOT NULL,
  "hanh_dong" VARCHAR(200) NOT NULL,
  "chi_tiet" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "nhat_ky_he_thong_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nhat_ky_he_thong_created_at_idx"
  ON "nhat_ky_he_thong"("created_at");

CREATE INDEX "nhat_ky_he_thong_phan_he_idx"
  ON "nhat_ky_he_thong"("phan_he");

CREATE INDEX "nhat_ky_he_thong_nguoi_dung_id_idx"
  ON "nhat_ky_he_thong"("nguoi_dung_id");

ALTER TABLE "nhat_ky_he_thong"
  ADD CONSTRAINT "nhat_ky_he_thong_nguoi_dung_id_fkey"
  FOREIGN KEY ("nguoi_dung_id")
  REFERENCES "nguoi_dung"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Tạo dữ liệu nhật ký ban đầu từ lần đăng nhập cuối đang có thật.
INSERT INTO "nhat_ky_he_thong" (
  "nguoi_dung_id",
  "ho_ten",
  "email",
  "vai_tro",
  "phan_he",
  "hanh_dong",
  "chi_tiet",
  "created_at"
)
SELECT
  nd."id",
  nd."ho_ten",
  nd."email",
  COALESCE(
    string_agg(DISTINCT vt."ten_vai_tro", ', ' ORDER BY vt."ten_vai_tro"),
    'Chưa xác định'
  ),
  'XAC_THUC'::"phan_he_nhat_ky_he_thong",
  'Đăng nhập vào hệ thống',
  'Bản ghi khởi tạo từ lần đăng nhập cuối đã có',
  nd."lan_dang_nhap_cuoi"
FROM "nguoi_dung" nd
LEFT JOIN "nguoi_dung_vai_tro" ndvt
  ON ndvt."nguoi_dung_id" = nd."id"
LEFT JOIN "vai_tro" vt
  ON vt."id" = ndvt."vai_tro_id"
WHERE nd."lan_dang_nhap_cuoi" IS NOT NULL
GROUP BY nd."id", nd."ho_ten", nd."email", nd."lan_dang_nhap_cuoi";
