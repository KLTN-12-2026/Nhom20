-- Lưu riêng việc dược sĩ từ chối cấp thuốc để không nhầm với hủy đơn.
ALTER TYPE "trang_thai_don_thuoc" ADD VALUE IF NOT EXISTS 'TU_CHOI_CAP_THUOC';

ALTER TABLE "don_thuoc"
  ADD COLUMN IF NOT EXISTS "ly_do_tu_choi" TEXT,
  ADD COLUMN IF NOT EXISTS "nguoi_tu_choi_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "thoi_gian_tu_choi" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "don_thuoc_nguoi_tu_choi_id_idx"
  ON "don_thuoc"("nguoi_tu_choi_id");

ALTER TABLE "don_thuoc"
  ADD CONSTRAINT "don_thuoc_nguoi_tu_choi_id_fkey"
  FOREIGN KEY ("nguoi_tu_choi_id") REFERENCES "nguoi_dung"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
