ALTER TABLE "nguoi_dung"
ADD CONSTRAINT "nguoi_dung_phai_co_dinh_danh_dang_nhap"
CHECK ("email" IS NOT NULL OR "so_dien_thoai" IS NOT NULL);

ALTER TABLE "bac_si"
ADD CONSTRAINT "bac_si_so_nam_kinh_nghiem_khong_am"
CHECK ("so_nam_kinh_nghiem" >= 0);

ALTER TABLE "chuyen_khoa"
ADD CONSTRAINT "chuyen_khoa_phi_kham_khong_am"
CHECK ("phi_kham" >= 0);

ALTER TABLE "lich_lam_viec_bac_si"
ADD CONSTRAINT "lich_lam_viec_gio_ket_thuc_sau_gio_bat_dau"
CHECK ("gio_ket_thuc" > "gio_bat_dau");

ALTER TABLE "phieu_hang_cho"
ADD CONSTRAINT "phieu_hang_cho_so_thu_tu_duong"
CHECK ("so_thu_tu" > 0);

ALTER TABLE "chi_tiet_don_thuoc"
ADD CONSTRAINT "chi_tiet_don_thuoc_so_luong_duong"
CHECK ("so_luong" > 0);

ALTER TABLE "chi_tiet_don_thuoc"
ADD CONSTRAINT "chi_tiet_don_thuoc_so_ngay_su_dung_duong"
CHECK ("so_ngay_su_dung" > 0);

ALTER TABLE "chi_tiet_don_thuoc"
ADD CONSTRAINT "chi_tiet_don_thuoc_don_gia_khong_am"
CHECK ("don_gia" >= 0);

ALTER TABLE "chi_tiet_don_thuoc"
ADD CONSTRAINT "chi_tiet_don_thuoc_thanh_tien_hop_le"
CHECK ("thanh_tien" = "so_luong" * "don_gia");

ALTER TABLE "thuoc"
ADD CONSTRAINT "thuoc_gia_nhap_khong_am"
CHECK ("gia_nhap" >= 0);

ALTER TABLE "thuoc"
ADD CONSTRAINT "thuoc_gia_ban_khong_am"
CHECK ("gia_ban" >= 0);

ALTER TABLE "thuoc"
ADD CONSTRAINT "thuoc_so_luong_ton_khong_am"
CHECK ("so_luong_ton" >= 0);

ALTER TABLE "thuoc"
ADD CONSTRAINT "thuoc_muc_ton_toi_thieu_khong_am"
CHECK ("muc_ton_toi_thieu" >= 0);

ALTER TABLE "giao_dich_kho"
ADD CONSTRAINT "giao_dich_kho_so_luong_duong"
CHECK ("so_luong" > 0);

ALTER TABLE "giao_dich_kho"
ADD CONSTRAINT "giao_dich_kho_so_luong_truoc_khong_am"
CHECK ("so_luong_truoc" >= 0);

ALTER TABLE "giao_dich_kho"
ADD CONSTRAINT "giao_dich_kho_so_luong_sau_khong_am"
CHECK ("so_luong_sau" >= 0);

ALTER TABLE "hoa_don"
ADD CONSTRAINT "hoa_don_cac_khoan_tien_khong_am"
CHECK (
  "tien_kham" >= 0
  AND "tien_thuoc" >= 0
  AND "phi_dich_vu" >= 0
  AND "so_tien_giam" >= 0
);

ALTER TABLE "hoa_don"
ADD CONSTRAINT "hoa_don_tong_tien_hop_le"
CHECK (
  "tong_tien" = "tien_kham" + "tien_thuoc" + "phi_dich_vu" - "so_tien_giam"
  AND "tong_tien" >= 0
);

ALTER TABLE "thanh_toan"
ADD CONSTRAINT "thanh_toan_so_tien_duong"
CHECK ("so_tien" > 0);
