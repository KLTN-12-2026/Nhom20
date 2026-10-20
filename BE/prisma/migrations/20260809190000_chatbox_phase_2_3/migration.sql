-- Phase 2/3 Chatbox: secure guest session token and persistent appointment drafts.
CREATE TYPE "trang_thai_ban_nhap_dat_lich_chat" AS ENUM ('DANG_CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DA_HUY');

ALTER TABLE "phien_chat" ADD COLUMN "guest_token_hash" VARCHAR(128);

CREATE TABLE "ban_nhap_dat_lich_chat" (
  "id" SERIAL NOT NULL,
  "phien_chat_id" INTEGER NOT NULL,
  "ho_ten" VARCHAR(150) NOT NULL,
  "so_dien_thoai" VARCHAR(20) NOT NULL,
  "ngay_sinh" DATE NOT NULL,
  "gioi_tinh" "gioi_tinh" NOT NULL,
  "email" VARCHAR(255),
  "chuyen_khoa_id" INTEGER NOT NULL,
  "ngay_hen" DATE NOT NULL,
  "gio_bat_dau" TIME(0) NOT NULL,
  "ly_do_kham" TEXT NOT NULL,
  "ghi_chu" TEXT,
  "trang_thai" "trang_thai_ban_nhap_dat_lich_chat" NOT NULL DEFAULT 'DANG_CHO_XAC_NHAN',
  "lich_hen_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ban_nhap_dat_lich_chat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ban_nhap_dat_lich_chat_lich_hen_id_key" ON "ban_nhap_dat_lich_chat"("lich_hen_id");
CREATE INDEX "ban_nhap_dat_lich_chat_phien_chat_id_trang_thai_idx" ON "ban_nhap_dat_lich_chat"("phien_chat_id", "trang_thai");
CREATE INDEX "ban_nhap_dat_lich_chat_chuyen_khoa_id_idx" ON "ban_nhap_dat_lich_chat"("chuyen_khoa_id");
ALTER TABLE "ban_nhap_dat_lich_chat" ADD CONSTRAINT "ban_nhap_dat_lich_chat_phien_chat_id_fkey" FOREIGN KEY ("phien_chat_id") REFERENCES "phien_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
