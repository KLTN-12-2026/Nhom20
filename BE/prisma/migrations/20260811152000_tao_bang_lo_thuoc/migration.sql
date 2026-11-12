-- Tạo bảng lô thuốc trước migration chuẩn hóa dữ liệu tồn kho kế thừa.
CREATE TABLE IF NOT EXISTS "lo_thuoc" (
  "id" SERIAL NOT NULL,
  "thuoc_id" INTEGER NOT NULL,
  "ma_lo" VARCHAR(100) NOT NULL,
  "ngay_san_xuat" DATE,
  "han_dung" DATE NOT NULL,
  "nha_cung_cap" VARCHAR(200) NOT NULL,
  "gia_nhap" DECIMAL(15, 2) NOT NULL,
  "so_luong_nhap" INTEGER NOT NULL,
  "so_luong_con_lai" INTEGER NOT NULL,
  "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
  "ghi_chu" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "lo_thuoc_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lo_thuoc_ma_lo_key" UNIQUE ("ma_lo"),
  CONSTRAINT "lo_thuoc_thuoc_id_fkey"
    FOREIGN KEY ("thuoc_id") REFERENCES "thuoc"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lo_thuoc_thuoc_id_han_dung_so_luong_con_lai_idx"
  ON "lo_thuoc" ("thuoc_id", "han_dung", "so_luong_con_lai");
CREATE INDEX IF NOT EXISTS "lo_thuoc_trang_thai_idx"
  ON "lo_thuoc" ("trang_thai");
