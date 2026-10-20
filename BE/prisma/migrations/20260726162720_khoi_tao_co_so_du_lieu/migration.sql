-- CreateEnum
CREATE TYPE "trang_thai_nguoi_dung" AS ENUM ('DANG_HOAT_DONG', 'NGUNG_HOAT_DONG', 'BI_KHOA');

-- CreateEnum
CREATE TYPE "gioi_tinh" AS ENUM ('NAM', 'NU', 'KHAC');

-- CreateEnum
CREATE TYPE "trang_thai_chung" AS ENUM ('DANG_HOAT_DONG', 'NGUNG_HOAT_DONG');

-- CreateEnum
CREATE TYPE "chuc_vu_nhan_vien" AS ENUM ('LE_TAN_THU_NGAN', 'DUOC_SI', 'NHAN_VIEN_HO_TRO');

-- CreateEnum
CREATE TYPE "hinh_thuc_kham" AS ENUM ('KHAM_TRUC_TIEP', 'DAT_LICH_TRUOC');

-- CreateEnum
CREATE TYPE "trang_thai_luot_kham" AS ENUM ('DA_DANG_KY', 'DANG_CHO', 'DA_VAO_PHONG', 'DA_HOAN_TAT', 'DA_HUY');

-- CreateEnum
CREATE TYPE "trang_thai_hang_cho" AS ENUM ('CHO_GOI', 'DANG_GOI', 'DA_VAO_PHONG', 'DA_HOAN_TAT', 'BO_QUA', 'DA_HUY');

-- CreateEnum
CREATE TYPE "trang_thai_don_thuoc" AS ENUM ('CHO_CAP_THUOC', 'DANG_XU_LY', 'DA_CAP_THUOC', 'KHONG_DU_THUOC', 'DA_HUY');

-- CreateEnum
CREATE TYPE "loai_giao_dich_kho" AS ENUM ('NHAP_KHO', 'XUAT_KHO', 'CAP_THUOC', 'DIEU_CHINH', 'HOAN_TRA');

-- CreateEnum
CREATE TYPE "trang_thai_hoa_don" AS ENUM ('BAN_NHAP', 'CHUA_THANH_TOAN', 'CHO_THANH_TOAN', 'DA_THANH_TOAN', 'DA_HUY');

-- CreateEnum
CREATE TYPE "phuong_thuc_thanh_toan" AS ENUM ('TIEN_MAT', 'CHUYEN_KHOAN', 'SEPAY');

-- CreateEnum
CREATE TYPE "trang_thai_thanh_toan" AS ENUM ('DANG_CHO', 'THANH_CONG', 'THAT_BAI', 'DA_HUY');

-- CreateTable
CREATE TABLE "nguoi_dung" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255),
    "so_dien_thoai" VARCHAR(20),
    "mat_khau" VARCHAR(255) NOT NULL,
    "ho_ten" VARCHAR(150) NOT NULL,
    "trang_thai" "trang_thai_nguoi_dung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "lan_dang_nhap_cuoi" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nguoi_dung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vai_tro" (
    "id" SERIAL NOT NULL,
    "ma_vai_tro" VARCHAR(50) NOT NULL,
    "ten_vai_tro" VARCHAR(100) NOT NULL,
    "mo_ta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vai_tro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quyen" (
    "id" SERIAL NOT NULL,
    "ma_quyen" VARCHAR(100) NOT NULL,
    "ten_quyen" VARCHAR(150) NOT NULL,
    "phan_he" VARCHAR(100) NOT NULL,
    "mo_ta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quyen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nguoi_dung_vai_tro" (
    "id" SERIAL NOT NULL,
    "nguoi_dung_id" INTEGER NOT NULL,
    "vai_tro_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nguoi_dung_vai_tro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vai_tro_quyen" (
    "id" SERIAL NOT NULL,
    "vai_tro_id" INTEGER NOT NULL,
    "quyen_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vai_tro_quyen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benh_nhan" (
    "id" SERIAL NOT NULL,
    "nguoi_dung_id" INTEGER,
    "ma_benh_nhan" VARCHAR(30) NOT NULL,
    "ho_ten" VARCHAR(150) NOT NULL,
    "so_dien_thoai" VARCHAR(20) NOT NULL,
    "ngay_sinh" DATE,
    "gioi_tinh" "gioi_tinh",
    "dia_chi" TEXT,
    "so_can_cuoc" VARCHAR(20),
    "ghi_chu_di_ung" TEXT,
    "ghi_chu_tien_su_benh" TEXT,
    "nguoi_lien_he_khan_cap" VARCHAR(150),
    "so_dien_thoai_khan_cap" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benh_nhan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhan_vien" (
    "id" SERIAL NOT NULL,
    "nguoi_dung_id" INTEGER NOT NULL,
    "ma_nhan_vien" VARCHAR(30) NOT NULL,
    "ho_ten" VARCHAR(150) NOT NULL,
    "so_dien_thoai" VARCHAR(20),
    "chuc_vu" "chuc_vu_nhan_vien" NOT NULL,
    "ngay_vao_lam" DATE NOT NULL,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nhan_vien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bac_si" (
    "id" SERIAL NOT NULL,
    "nguoi_dung_id" INTEGER NOT NULL,
    "ma_bac_si" VARCHAR(30) NOT NULL,
    "chuyen_khoa_id" INTEGER NOT NULL,
    "ho_ten" VARCHAR(150) NOT NULL,
    "so_dien_thoai" VARCHAR(20),
    "hoc_vi" VARCHAR(100),
    "so_nam_kinh_nghiem" INTEGER NOT NULL DEFAULT 0,
    "mo_ta" TEXT,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bac_si_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chuyen_khoa" (
    "id" SERIAL NOT NULL,
    "ma_chuyen_khoa" VARCHAR(30) NOT NULL,
    "ten_chuyen_khoa" VARCHAR(150) NOT NULL,
    "mo_ta" TEXT,
    "phi_kham" DECIMAL(15,2) NOT NULL,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chuyen_khoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phong_kham" (
    "id" SERIAL NOT NULL,
    "ma_phong" VARCHAR(30) NOT NULL,
    "ten_phong" VARCHAR(150) NOT NULL,
    "chuyen_khoa_id" INTEGER NOT NULL,
    "tang" INTEGER,
    "mo_ta" TEXT,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phong_kham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lich_lam_viec_bac_si" (
    "id" SERIAL NOT NULL,
    "bac_si_id" INTEGER NOT NULL,
    "phong_kham_id" INTEGER NOT NULL,
    "ngay_lam_viec" DATE NOT NULL,
    "gio_bat_dau" TIME(0) NOT NULL,
    "gio_ket_thuc" TIME(0) NOT NULL,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lich_lam_viec_bac_si_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "luot_kham" (
    "id" SERIAL NOT NULL,
    "ma_luot_kham" VARCHAR(30) NOT NULL,
    "benh_nhan_id" INTEGER NOT NULL,
    "chuyen_khoa_id" INTEGER NOT NULL,
    "bac_si_id" INTEGER,
    "phong_kham_id" INTEGER,
    "hinh_thuc_kham" "hinh_thuc_kham" NOT NULL,
    "thoi_gian_hen" TIMESTAMP(3),
    "ly_do_kham" TEXT NOT NULL,
    "trieu_chung_ban_dau" TEXT,
    "trang_thai" "trang_thai_luot_kham" NOT NULL DEFAULT 'DA_DANG_KY',
    "thoi_gian_dang_ky" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoi_gian_hoan_tat" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "luot_kham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phieu_hang_cho" (
    "id" SERIAL NOT NULL,
    "luot_kham_id" INTEGER NOT NULL,
    "so_thu_tu" INTEGER NOT NULL,
    "ma_so_thu_tu" VARCHAR(30) NOT NULL,
    "ngay_xep_hang" DATE NOT NULL,
    "chuyen_khoa_id" INTEGER NOT NULL,
    "phong_kham_id" INTEGER,
    "trang_thai" "trang_thai_hang_cho" NOT NULL DEFAULT 'CHO_GOI',
    "thoi_gian_goi" TIMESTAMP(3),
    "thoi_gian_xac_nhan" TIMESTAMP(3),
    "thoi_gian_bo_qua" TIMESTAMP(3),
    "thoi_gian_hoan_tat" TIMESTAMP(3),
    "nguoi_goi_id" INTEGER,
    "nguoi_xac_nhan_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phieu_hang_cho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ho_so_kham" (
    "id" SERIAL NOT NULL,
    "luot_kham_id" INTEGER NOT NULL,
    "benh_nhan_id" INTEGER NOT NULL,
    "bac_si_id" INTEGER NOT NULL,
    "trieu_chung" TEXT,
    "chan_doan" TEXT NOT NULL,
    "ket_luan" TEXT,
    "ghi_chu_bac_si" TEXT,
    "ngay_tai_kham" DATE,
    "thoi_gian_nop" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ho_so_kham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "don_thuoc" (
    "id" SERIAL NOT NULL,
    "ma_don_thuoc" VARCHAR(30) NOT NULL,
    "ho_so_kham_id" INTEGER NOT NULL,
    "benh_nhan_id" INTEGER NOT NULL,
    "bac_si_id" INTEGER NOT NULL,
    "trang_thai" "trang_thai_don_thuoc" NOT NULL DEFAULT 'CHO_CAP_THUOC',
    "ghi_chu_bac_si" TEXT,
    "nguoi_cap_thuoc_id" INTEGER,
    "thoi_gian_cap_thuoc" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "don_thuoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chi_tiet_don_thuoc" (
    "id" SERIAL NOT NULL,
    "don_thuoc_id" INTEGER NOT NULL,
    "thuoc_id" INTEGER NOT NULL,
    "so_luong" INTEGER NOT NULL,
    "lieu_dung" VARCHAR(255) NOT NULL,
    "tan_suat" VARCHAR(255) NOT NULL,
    "so_ngay_su_dung" INTEGER NOT NULL,
    "huong_dan_su_dung" TEXT,
    "don_gia" DECIMAL(15,2) NOT NULL,
    "thanh_tien" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chi_tiet_don_thuoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thuoc" (
    "id" SERIAL NOT NULL,
    "ma_thuoc" VARCHAR(30) NOT NULL,
    "ten_thuoc" VARCHAR(200) NOT NULL,
    "hoat_chat" VARCHAR(255),
    "don_vi_tinh" VARCHAR(50) NOT NULL,
    "gia_nhap" DECIMAL(15,2) NOT NULL,
    "gia_ban" DECIMAL(15,2) NOT NULL,
    "so_luong_ton" INTEGER NOT NULL DEFAULT 0,
    "muc_ton_toi_thieu" INTEGER NOT NULL DEFAULT 0,
    "han_su_dung" DATE,
    "nha_san_xuat" VARCHAR(200),
    "mo_ta" TEXT,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thuoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giao_dich_kho" (
    "id" SERIAL NOT NULL,
    "thuoc_id" INTEGER NOT NULL,
    "loai_giao_dich" "loai_giao_dich_kho" NOT NULL,
    "so_luong" INTEGER NOT NULL,
    "so_luong_truoc" INTEGER NOT NULL,
    "so_luong_sau" INTEGER NOT NULL,
    "loai_tham_chieu" VARCHAR(50),
    "ma_tham_chieu" VARCHAR(100),
    "ghi_chu" TEXT,
    "nguoi_thuc_hien_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "giao_dich_kho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hoa_don" (
    "id" SERIAL NOT NULL,
    "ma_hoa_don" VARCHAR(30) NOT NULL,
    "luot_kham_id" INTEGER NOT NULL,
    "benh_nhan_id" INTEGER NOT NULL,
    "tien_kham" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tien_thuoc" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "phi_dich_vu" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "so_tien_giam" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tong_tien" DECIMAL(15,2) NOT NULL,
    "trang_thai" "trang_thai_hoa_don" NOT NULL DEFAULT 'BAN_NHAP',
    "nguoi_tao_id" INTEGER NOT NULL,
    "thoi_gian_thanh_toan" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hoa_don_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thanh_toan" (
    "id" SERIAL NOT NULL,
    "hoa_don_id" INTEGER NOT NULL,
    "so_tien" DECIMAL(15,2) NOT NULL,
    "phuong_thuc" "phuong_thuc_thanh_toan" NOT NULL,
    "ma_giao_dich" VARCHAR(100),
    "trang_thai" "trang_thai_thanh_toan" NOT NULL DEFAULT 'DANG_CHO',
    "nguoi_thu_tien_id" INTEGER,
    "thoi_gian_thanh_toan" TIMESTAMP(3),
    "ghi_chu" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thanh_toan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_email_key" ON "nguoi_dung"("email");

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_so_dien_thoai_key" ON "nguoi_dung"("so_dien_thoai");

-- CreateIndex
CREATE INDEX "nguoi_dung_email_idx" ON "nguoi_dung"("email");

-- CreateIndex
CREATE INDEX "nguoi_dung_so_dien_thoai_idx" ON "nguoi_dung"("so_dien_thoai");

-- CreateIndex
CREATE UNIQUE INDEX "vai_tro_ma_vai_tro_key" ON "vai_tro"("ma_vai_tro");

-- CreateIndex
CREATE UNIQUE INDEX "quyen_ma_quyen_key" ON "quyen"("ma_quyen");

-- CreateIndex
CREATE INDEX "nguoi_dung_vai_tro_vai_tro_id_idx" ON "nguoi_dung_vai_tro"("vai_tro_id");

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_vai_tro_nguoi_dung_id_vai_tro_id_key" ON "nguoi_dung_vai_tro"("nguoi_dung_id", "vai_tro_id");

-- CreateIndex
CREATE INDEX "vai_tro_quyen_quyen_id_idx" ON "vai_tro_quyen"("quyen_id");

-- CreateIndex
CREATE UNIQUE INDEX "vai_tro_quyen_vai_tro_id_quyen_id_key" ON "vai_tro_quyen"("vai_tro_id", "quyen_id");

-- CreateIndex
CREATE UNIQUE INDEX "benh_nhan_nguoi_dung_id_key" ON "benh_nhan"("nguoi_dung_id");

-- CreateIndex
CREATE UNIQUE INDEX "benh_nhan_ma_benh_nhan_key" ON "benh_nhan"("ma_benh_nhan");

-- CreateIndex
CREATE INDEX "benh_nhan_so_dien_thoai_idx" ON "benh_nhan"("so_dien_thoai");

-- CreateIndex
CREATE INDEX "benh_nhan_ho_ten_idx" ON "benh_nhan"("ho_ten");

-- CreateIndex
CREATE UNIQUE INDEX "nhan_vien_nguoi_dung_id_key" ON "nhan_vien"("nguoi_dung_id");

-- CreateIndex
CREATE UNIQUE INDEX "nhan_vien_ma_nhan_vien_key" ON "nhan_vien"("ma_nhan_vien");

-- CreateIndex
CREATE UNIQUE INDEX "bac_si_nguoi_dung_id_key" ON "bac_si"("nguoi_dung_id");

-- CreateIndex
CREATE UNIQUE INDEX "bac_si_ma_bac_si_key" ON "bac_si"("ma_bac_si");

-- CreateIndex
CREATE INDEX "bac_si_chuyen_khoa_id_idx" ON "bac_si"("chuyen_khoa_id");

-- CreateIndex
CREATE UNIQUE INDEX "chuyen_khoa_ma_chuyen_khoa_key" ON "chuyen_khoa"("ma_chuyen_khoa");

-- CreateIndex
CREATE UNIQUE INDEX "chuyen_khoa_ten_chuyen_khoa_key" ON "chuyen_khoa"("ten_chuyen_khoa");

-- CreateIndex
CREATE UNIQUE INDEX "phong_kham_ma_phong_key" ON "phong_kham"("ma_phong");

-- CreateIndex
CREATE INDEX "phong_kham_chuyen_khoa_id_idx" ON "phong_kham"("chuyen_khoa_id");

-- CreateIndex
CREATE INDEX "lich_lam_viec_bac_si_bac_si_id_idx" ON "lich_lam_viec_bac_si"("bac_si_id");

-- CreateIndex
CREATE INDEX "lich_lam_viec_bac_si_ngay_lam_viec_idx" ON "lich_lam_viec_bac_si"("ngay_lam_viec");

-- CreateIndex
CREATE INDEX "lich_lam_viec_bac_si_phong_kham_id_idx" ON "lich_lam_viec_bac_si"("phong_kham_id");

-- CreateIndex
CREATE UNIQUE INDEX "lich_lam_viec_bac_si_bac_si_id_phong_kham_id_ngay_lam_viec__key" ON "lich_lam_viec_bac_si"("bac_si_id", "phong_kham_id", "ngay_lam_viec", "gio_bat_dau");

-- CreateIndex
CREATE UNIQUE INDEX "luot_kham_ma_luot_kham_key" ON "luot_kham"("ma_luot_kham");

-- CreateIndex
CREATE INDEX "luot_kham_benh_nhan_id_idx" ON "luot_kham"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "luot_kham_chuyen_khoa_id_idx" ON "luot_kham"("chuyen_khoa_id");

-- CreateIndex
CREATE INDEX "luot_kham_bac_si_id_idx" ON "luot_kham"("bac_si_id");

-- CreateIndex
CREATE INDEX "luot_kham_phong_kham_id_idx" ON "luot_kham"("phong_kham_id");

-- CreateIndex
CREATE INDEX "luot_kham_trang_thai_idx" ON "luot_kham"("trang_thai");

-- CreateIndex
CREATE INDEX "luot_kham_thoi_gian_dang_ky_idx" ON "luot_kham"("thoi_gian_dang_ky");

-- CreateIndex
CREATE UNIQUE INDEX "phieu_hang_cho_luot_kham_id_key" ON "phieu_hang_cho"("luot_kham_id");

-- CreateIndex
CREATE INDEX "phieu_hang_cho_ngay_xep_hang_idx" ON "phieu_hang_cho"("ngay_xep_hang");

-- CreateIndex
CREATE INDEX "phieu_hang_cho_trang_thai_idx" ON "phieu_hang_cho"("trang_thai");

-- CreateIndex
CREATE INDEX "phieu_hang_cho_phong_kham_id_idx" ON "phieu_hang_cho"("phong_kham_id");

-- CreateIndex
CREATE INDEX "phieu_hang_cho_nguoi_goi_id_idx" ON "phieu_hang_cho"("nguoi_goi_id");

-- CreateIndex
CREATE INDEX "phieu_hang_cho_nguoi_xac_nhan_id_idx" ON "phieu_hang_cho"("nguoi_xac_nhan_id");

-- CreateIndex
CREATE UNIQUE INDEX "phieu_hang_cho_ngay_xep_hang_chuyen_khoa_id_so_thu_tu_key" ON "phieu_hang_cho"("ngay_xep_hang", "chuyen_khoa_id", "so_thu_tu");

-- CreateIndex
CREATE UNIQUE INDEX "ho_so_kham_luot_kham_id_key" ON "ho_so_kham"("luot_kham_id");

-- CreateIndex
CREATE INDEX "ho_so_kham_benh_nhan_id_idx" ON "ho_so_kham"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "ho_so_kham_bac_si_id_idx" ON "ho_so_kham"("bac_si_id");

-- CreateIndex
CREATE UNIQUE INDEX "don_thuoc_ma_don_thuoc_key" ON "don_thuoc"("ma_don_thuoc");

-- CreateIndex
CREATE UNIQUE INDEX "don_thuoc_ho_so_kham_id_key" ON "don_thuoc"("ho_so_kham_id");

-- CreateIndex
CREATE INDEX "don_thuoc_trang_thai_idx" ON "don_thuoc"("trang_thai");

-- CreateIndex
CREATE INDEX "don_thuoc_benh_nhan_id_idx" ON "don_thuoc"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "don_thuoc_bac_si_id_idx" ON "don_thuoc"("bac_si_id");

-- CreateIndex
CREATE INDEX "don_thuoc_nguoi_cap_thuoc_id_idx" ON "don_thuoc"("nguoi_cap_thuoc_id");

-- CreateIndex
CREATE INDEX "chi_tiet_don_thuoc_thuoc_id_idx" ON "chi_tiet_don_thuoc"("thuoc_id");

-- CreateIndex
CREATE UNIQUE INDEX "chi_tiet_don_thuoc_don_thuoc_id_thuoc_id_key" ON "chi_tiet_don_thuoc"("don_thuoc_id", "thuoc_id");

-- CreateIndex
CREATE UNIQUE INDEX "thuoc_ma_thuoc_key" ON "thuoc"("ma_thuoc");

-- CreateIndex
CREATE INDEX "thuoc_ten_thuoc_idx" ON "thuoc"("ten_thuoc");

-- CreateIndex
CREATE INDEX "thuoc_trang_thai_idx" ON "thuoc"("trang_thai");

-- CreateIndex
CREATE INDEX "giao_dich_kho_thuoc_id_idx" ON "giao_dich_kho"("thuoc_id");

-- CreateIndex
CREATE INDEX "giao_dich_kho_loai_giao_dich_idx" ON "giao_dich_kho"("loai_giao_dich");

-- CreateIndex
CREATE INDEX "giao_dich_kho_created_at_idx" ON "giao_dich_kho"("created_at");

-- CreateIndex
CREATE INDEX "giao_dich_kho_nguoi_thuc_hien_id_idx" ON "giao_dich_kho"("nguoi_thuc_hien_id");

-- CreateIndex
CREATE INDEX "giao_dich_kho_loai_tham_chieu_ma_tham_chieu_idx" ON "giao_dich_kho"("loai_tham_chieu", "ma_tham_chieu");

-- CreateIndex
CREATE UNIQUE INDEX "hoa_don_ma_hoa_don_key" ON "hoa_don"("ma_hoa_don");

-- CreateIndex
CREATE UNIQUE INDEX "hoa_don_luot_kham_id_key" ON "hoa_don"("luot_kham_id");

-- CreateIndex
CREATE INDEX "hoa_don_trang_thai_idx" ON "hoa_don"("trang_thai");

-- CreateIndex
CREATE INDEX "hoa_don_created_at_idx" ON "hoa_don"("created_at");

-- CreateIndex
CREATE INDEX "hoa_don_benh_nhan_id_idx" ON "hoa_don"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "hoa_don_nguoi_tao_id_idx" ON "hoa_don"("nguoi_tao_id");

-- CreateIndex
CREATE INDEX "thanh_toan_hoa_don_id_idx" ON "thanh_toan"("hoa_don_id");

-- CreateIndex
CREATE INDEX "thanh_toan_trang_thai_idx" ON "thanh_toan"("trang_thai");

-- CreateIndex
CREATE INDEX "thanh_toan_ma_giao_dich_idx" ON "thanh_toan"("ma_giao_dich");

-- CreateIndex
CREATE INDEX "thanh_toan_nguoi_thu_tien_id_idx" ON "thanh_toan"("nguoi_thu_tien_id");

-- AddForeignKey
ALTER TABLE "nguoi_dung_vai_tro" ADD CONSTRAINT "nguoi_dung_vai_tro_nguoi_dung_id_fkey" FOREIGN KEY ("nguoi_dung_id") REFERENCES "nguoi_dung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nguoi_dung_vai_tro" ADD CONSTRAINT "nguoi_dung_vai_tro_vai_tro_id_fkey" FOREIGN KEY ("vai_tro_id") REFERENCES "vai_tro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vai_tro_quyen" ADD CONSTRAINT "vai_tro_quyen_vai_tro_id_fkey" FOREIGN KEY ("vai_tro_id") REFERENCES "vai_tro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vai_tro_quyen" ADD CONSTRAINT "vai_tro_quyen_quyen_id_fkey" FOREIGN KEY ("quyen_id") REFERENCES "quyen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benh_nhan" ADD CONSTRAINT "benh_nhan_nguoi_dung_id_fkey" FOREIGN KEY ("nguoi_dung_id") REFERENCES "nguoi_dung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhan_vien" ADD CONSTRAINT "nhan_vien_nguoi_dung_id_fkey" FOREIGN KEY ("nguoi_dung_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bac_si" ADD CONSTRAINT "bac_si_nguoi_dung_id_fkey" FOREIGN KEY ("nguoi_dung_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bac_si" ADD CONSTRAINT "bac_si_chuyen_khoa_id_fkey" FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phong_kham" ADD CONSTRAINT "phong_kham_chuyen_khoa_id_fkey" FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_lam_viec_bac_si" ADD CONSTRAINT "lich_lam_viec_bac_si_bac_si_id_fkey" FOREIGN KEY ("bac_si_id") REFERENCES "bac_si"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_lam_viec_bac_si" ADD CONSTRAINT "lich_lam_viec_bac_si_phong_kham_id_fkey" FOREIGN KEY ("phong_kham_id") REFERENCES "phong_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "luot_kham" ADD CONSTRAINT "luot_kham_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "luot_kham" ADD CONSTRAINT "luot_kham_chuyen_khoa_id_fkey" FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "luot_kham" ADD CONSTRAINT "luot_kham_bac_si_id_fkey" FOREIGN KEY ("bac_si_id") REFERENCES "bac_si"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "luot_kham" ADD CONSTRAINT "luot_kham_phong_kham_id_fkey" FOREIGN KEY ("phong_kham_id") REFERENCES "phong_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_hang_cho" ADD CONSTRAINT "phieu_hang_cho_luot_kham_id_fkey" FOREIGN KEY ("luot_kham_id") REFERENCES "luot_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_hang_cho" ADD CONSTRAINT "phieu_hang_cho_chuyen_khoa_id_fkey" FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_hang_cho" ADD CONSTRAINT "phieu_hang_cho_phong_kham_id_fkey" FOREIGN KEY ("phong_kham_id") REFERENCES "phong_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_hang_cho" ADD CONSTRAINT "phieu_hang_cho_nguoi_goi_id_fkey" FOREIGN KEY ("nguoi_goi_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_hang_cho" ADD CONSTRAINT "phieu_hang_cho_nguoi_xac_nhan_id_fkey" FOREIGN KEY ("nguoi_xac_nhan_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_kham" ADD CONSTRAINT "ho_so_kham_luot_kham_id_fkey" FOREIGN KEY ("luot_kham_id") REFERENCES "luot_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_kham" ADD CONSTRAINT "ho_so_kham_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_kham" ADD CONSTRAINT "ho_so_kham_bac_si_id_fkey" FOREIGN KEY ("bac_si_id") REFERENCES "bac_si"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "don_thuoc" ADD CONSTRAINT "don_thuoc_ho_so_kham_id_fkey" FOREIGN KEY ("ho_so_kham_id") REFERENCES "ho_so_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "don_thuoc" ADD CONSTRAINT "don_thuoc_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "don_thuoc" ADD CONSTRAINT "don_thuoc_bac_si_id_fkey" FOREIGN KEY ("bac_si_id") REFERENCES "bac_si"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "don_thuoc" ADD CONSTRAINT "don_thuoc_nguoi_cap_thuoc_id_fkey" FOREIGN KEY ("nguoi_cap_thuoc_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_don_thuoc" ADD CONSTRAINT "chi_tiet_don_thuoc_don_thuoc_id_fkey" FOREIGN KEY ("don_thuoc_id") REFERENCES "don_thuoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_don_thuoc" ADD CONSTRAINT "chi_tiet_don_thuoc_thuoc_id_fkey" FOREIGN KEY ("thuoc_id") REFERENCES "thuoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giao_dich_kho" ADD CONSTRAINT "giao_dich_kho_thuoc_id_fkey" FOREIGN KEY ("thuoc_id") REFERENCES "thuoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giao_dich_kho" ADD CONSTRAINT "giao_dich_kho_nguoi_thuc_hien_id_fkey" FOREIGN KEY ("nguoi_thuc_hien_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoa_don" ADD CONSTRAINT "hoa_don_luot_kham_id_fkey" FOREIGN KEY ("luot_kham_id") REFERENCES "luot_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoa_don" ADD CONSTRAINT "hoa_don_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoa_don" ADD CONSTRAINT "hoa_don_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_toan" ADD CONSTRAINT "thanh_toan_hoa_don_id_fkey" FOREIGN KEY ("hoa_don_id") REFERENCES "hoa_don"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thanh_toan" ADD CONSTRAINT "thanh_toan_nguoi_thu_tien_id_fkey" FOREIGN KEY ("nguoi_thu_tien_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
