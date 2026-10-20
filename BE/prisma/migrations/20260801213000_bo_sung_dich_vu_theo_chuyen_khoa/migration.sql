ALTER TYPE "phan_he_nhat_ky_he_thong" ADD VALUE IF NOT EXISTS 'DICH_VU';

ALTER TABLE "dich_vu"
ADD COLUMN "chuyen_khoa_id" INTEGER,
ADD COLUMN "thoi_gian_du_kien_phut" INTEGER;

CREATE INDEX "dich_vu_chuyen_khoa_id_idx" ON "dich_vu"("chuyen_khoa_id");

ALTER TABLE "dich_vu"
ADD CONSTRAINT "dich_vu_chuyen_khoa_id_fkey"
FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
