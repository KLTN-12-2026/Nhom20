-- Bổ sung trường thông tin hủy hóa đơn
ALTER TABLE "hoa_don" ADD COLUMN IF NOT EXISTS "ly_do_huy" VARCHAR(1000);
ALTER TABLE "hoa_don" ADD COLUMN IF NOT EXISTS "nguoi_huy_id" INTEGER;
ALTER TABLE "hoa_don" ADD COLUMN IF NOT EXISTS "thoi_gian_huy" TIMESTAMP(3);

-- Tạo khóa ngoại liên kết người hủy với người dùng
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hoa_don_nguoi_huy_id_fkey'
    ) THEN
        ALTER TABLE "hoa_don" ADD CONSTRAINT "hoa_don_nguoi_huy_id_fkey"
            FOREIGN KEY ("nguoi_huy_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
