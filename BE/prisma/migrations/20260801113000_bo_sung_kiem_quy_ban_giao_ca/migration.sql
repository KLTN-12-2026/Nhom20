ALTER TABLE "ban_giao_ca"
ADD COLUMN "tien_mat_he_thong" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN "tien_mat_thuc_te" DECIMAL(15, 2),
ADD COLUMN "tien_chuyen_khoan" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN "tien_sepay" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN "chenh_lech_tien_mat" DECIMAL(15, 2),
ADD COLUMN "ly_do_chenh_lech" TEXT;
