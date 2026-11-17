-- V24.2: migration additive; chỉ áp dụng trên database đã được chủ dự án duyệt.
CREATE TYPE "loai_dich_vu" AS ENUM ('KHAM', 'CAN_LAM_SANG');
CREATE TYPE "trang_thai_chi_dinh_dich_vu" AS ENUM ('CHO_THUC_HIEN', 'DA_HOAN_TAT', 'DA_HUY');
ALTER TABLE "dich_vu" ADD COLUMN "loai_dich_vu" "loai_dich_vu";

CREATE TABLE "chi_dinh_dich_vu" (
    "id" SERIAL NOT NULL,
    "luot_kham_id" INTEGER NOT NULL,
    "dich_vu_id" INTEGER NOT NULL,
    "bac_si_chi_dinh_id" INTEGER NOT NULL,
    "ly_do_chi_dinh" VARCHAR(1000) NOT NULL,
    "ghi_chu" VARCHAR(2000),
    "trang_thai" "trang_thai_chi_dinh_dich_vu" NOT NULL DEFAULT 'CHO_THUC_HIEN',
    "don_gia_snapshot" DECIMAL(15,2) NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "ket_qua" TEXT,
    "nguoi_nhap_ket_qua_id" INTEGER,
    "thoi_gian_co_ket_qua" TIMESTAMP(3),
    "ly_do_huy" VARCHAR(1000),
    "nguoi_huy_id" INTEGER,
    "thoi_gian_huy" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chi_dinh_dich_vu_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chi_dinh_dich_vu_idempotency_key_key" ON "chi_dinh_dich_vu"("idempotency_key");
CREATE INDEX "chi_dinh_dich_vu_luot_kham_id_trang_thai_idx" ON "chi_dinh_dich_vu"("luot_kham_id", "trang_thai");
CREATE INDEX "chi_dinh_dich_vu_dich_vu_id_idx" ON "chi_dinh_dich_vu"("dich_vu_id");
CREATE INDEX "chi_dinh_dich_vu_bac_si_chi_dinh_id_idx" ON "chi_dinh_dich_vu"("bac_si_chi_dinh_id");
CREATE INDEX "chi_dinh_dich_vu_nguoi_nhap_ket_qua_id_idx" ON "chi_dinh_dich_vu"("nguoi_nhap_ket_qua_id");
CREATE INDEX "chi_dinh_dich_vu_nguoi_huy_id_idx" ON "chi_dinh_dich_vu"("nguoi_huy_id");

ALTER TABLE "chi_dinh_dich_vu" ADD CONSTRAINT "chi_dinh_dich_vu_luot_kham_id_fkey" FOREIGN KEY ("luot_kham_id") REFERENCES "luot_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chi_dinh_dich_vu" ADD CONSTRAINT "chi_dinh_dich_vu_dich_vu_id_fkey" FOREIGN KEY ("dich_vu_id") REFERENCES "dich_vu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chi_dinh_dich_vu" ADD CONSTRAINT "chi_dinh_dich_vu_bac_si_chi_dinh_id_fkey" FOREIGN KEY ("bac_si_chi_dinh_id") REFERENCES "bac_si"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chi_dinh_dich_vu" ADD CONSTRAINT "chi_dinh_dich_vu_nguoi_nhap_ket_qua_id_fkey" FOREIGN KEY ("nguoi_nhap_ket_qua_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chi_dinh_dich_vu" ADD CONSTRAINT "chi_dinh_dich_vu_nguoi_huy_id_fkey" FOREIGN KEY ("nguoi_huy_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Nullable: các dòng hóa đơn cũ giữ nguyên. Unique: không tính tiền một chỉ định hai lần.
ALTER TABLE "chi_tiet_hoa_don" ADD COLUMN "chi_dinh_dich_vu_id" INTEGER;
CREATE UNIQUE INDEX "chi_tiet_hoa_don_chi_dinh_dich_vu_id_key" ON "chi_tiet_hoa_don"("chi_dinh_dich_vu_id");
ALTER TABLE "chi_tiet_hoa_don" ADD CONSTRAINT "chi_tiet_hoa_don_chi_dinh_dich_vu_id_fkey" FOREIGN KEY ("chi_dinh_dich_vu_id") REFERENCES "chi_dinh_dich_vu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
