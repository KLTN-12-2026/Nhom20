-- Tách dữ liệu khám theo chuyên khoa để chuyển dần từ JSONB cũ trong ho_so_kham.
CREATE TABLE "chi_tiet_kham_chuyen_khoa" (
  "id" SERIAL NOT NULL,
  "ho_so_kham_id" INTEGER NOT NULL,
  "chuyen_khoa_id" INTEGER NOT NULL,
  "du_lieu" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "chi_tiet_kham_chuyen_khoa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chi_tiet_kham_chuyen_khoa_ho_so_kham_id_key"
  ON "chi_tiet_kham_chuyen_khoa"("ho_so_kham_id");
CREATE INDEX "chi_tiet_kham_chuyen_khoa_chuyen_khoa_id_idx"
  ON "chi_tiet_kham_chuyen_khoa"("chuyen_khoa_id");

ALTER TABLE "chi_tiet_kham_chuyen_khoa"
  ADD CONSTRAINT "chi_tiet_kham_chuyen_khoa_ho_so_kham_id_fkey"
  FOREIGN KEY ("ho_so_kham_id") REFERENCES "ho_so_kham"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chi_tiet_kham_chuyen_khoa"
  ADD CONSTRAINT "chi_tiet_kham_chuyen_khoa_chuyen_khoa_id_fkey"
  FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Lưu các lựa chọn thay thế đã được duyệt để Backend lọc trước khi Gemini diễn giải.
CREATE TABLE "goi_y_thuoc_thay_the" (
  "id" SERIAL NOT NULL,
  "thuoc_can_tranh_id" INTEGER,
  "hoat_chat_can_tranh_id" INTEGER,
  "thuoc_thay_the_id" INTEGER NOT NULL,
  "ghi_chu_chuyen_mon" TEXT,
  "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
  "nguoi_duyet_id" INTEGER NOT NULL,
  "ngay_hieu_luc" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "goi_y_thuoc_thay_the_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "goi_y_thuoc_thay_the_thuoc_can_tranh_id_idx"
  ON "goi_y_thuoc_thay_the"("thuoc_can_tranh_id");
CREATE INDEX "goi_y_thuoc_thay_the_hoat_chat_can_tranh_id_idx"
  ON "goi_y_thuoc_thay_the"("hoat_chat_can_tranh_id");
CREATE INDEX "goi_y_thuoc_thay_the_thuoc_thay_the_id_idx"
  ON "goi_y_thuoc_thay_the"("thuoc_thay_the_id");
CREATE INDEX "goi_y_thuoc_thay_the_trang_thai_ngay_hieu_luc_idx"
  ON "goi_y_thuoc_thay_the"("trang_thai", "ngay_hieu_luc");

ALTER TABLE "goi_y_thuoc_thay_the"
  ADD CONSTRAINT "goi_y_thuoc_thay_the_thuoc_can_tranh_id_fkey"
  FOREIGN KEY ("thuoc_can_tranh_id") REFERENCES "thuoc"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goi_y_thuoc_thay_the"
  ADD CONSTRAINT "goi_y_thuoc_thay_the_hoat_chat_can_tranh_id_fkey"
  FOREIGN KEY ("hoat_chat_can_tranh_id") REFERENCES "hoat_chat"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goi_y_thuoc_thay_the"
  ADD CONSTRAINT "goi_y_thuoc_thay_the_thuoc_thay_the_id_fkey"
  FOREIGN KEY ("thuoc_thay_the_id") REFERENCES "thuoc"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goi_y_thuoc_thay_the"
  ADD CONSTRAINT "goi_y_thuoc_thay_the_nguoi_duyet_id_fkey"
  FOREIGN KEY ("nguoi_duyet_id") REFERENCES "nguoi_dung"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
