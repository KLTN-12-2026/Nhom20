-- CreateEnum
CREATE TYPE "trang_thai_lich_hen" AS ENUM ('CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DA_TU_CHOI', 'DA_HUY', 'DA_CHECK_IN', 'KHONG_DEN');

-- CreateEnum
CREATE TYPE "nguon_dat_lich" AS ENUM ('KHACH_VANG_LAI', 'BENH_NHAN', 'NHAN_VIEN', 'AI_HO_TRO');

-- CreateEnum
CREATE TYPE "muc_do_di_ung" AS ENUM ('CHUA_XAC_DINH', 'NHE', 'TRUNG_BINH', 'NGHIEM_TRONG');

-- CreateEnum
CREATE TYPE "trang_thai_xac_nhan_y_te" AS ENUM ('CHUA_XAC_NHAN', 'DA_XAC_NHAN', 'DA_PHU_NHAN');

-- CreateEnum
CREATE TYPE "loai_canh_bao_don_thuoc" AS ENUM ('DI_UNG_THUOC', 'TRUNG_HOAT_CHAT', 'TUONG_TAC_THUOC', 'VUOT_LIEU_KHUYEN_NGHI', 'CHONG_CHI_DINH');

-- CreateEnum
CREATE TYPE "muc_do_canh_bao" AS ENUM ('THONG_TIN', 'CAN_THAN', 'NGHIEM_TRONG');

-- CreateEnum
CREATE TYPE "nguon_canh_bao" AS ENUM ('QUY_TAC_HE_THONG', 'DU_LIEU_THUOC', 'AI_GEMINI');

-- CreateEnum
CREATE TYPE "trang_thai_xu_ly_canh_bao" AS ENUM ('CHO_XU_LY', 'DA_XAC_NHAN', 'DA_BO_QUA');

-- CreateEnum
CREATE TYPE "loai_muc_hoa_don" AS ENUM ('PHI_KHAM', 'TIEN_THUOC', 'DICH_VU', 'GOI_KHAM', 'PHU_THU', 'KHAC');

-- CreateEnum
CREATE TYPE "kenh_nhac_tai_kham" AS ENUM ('TRONG_UNG_DUNG', 'EMAIL', 'SMS', 'ZALO');

-- CreateEnum
CREATE TYPE "trang_thai_nhac" AS ENUM ('CHO_GUI', 'DANG_GUI', 'DA_GUI', 'THAT_BAI', 'DA_HUY');

-- CreateEnum
CREATE TYPE "trang_thai_danh_gia" AS ENUM ('CHO_DUYET', 'DA_HIEN_THI', 'DA_AN');

-- CreateEnum
CREATE TYPE "loai_phien_chat" AS ENUM ('TU_VAN_CHUNG', 'DAT_LICH', 'TRA_CUU_BAC_SI', 'TRA_CUU_GOI_KHAM', 'TRA_CUU_VOUCHER', 'HO_TRO_DON_THUOC');

-- CreateEnum
CREATE TYPE "trang_thai_phien_chat" AS ENUM ('DANG_HOAT_DONG', 'DA_KET_THUC', 'DA_XOA');

-- CreateEnum
CREATE TYPE "vai_tro_tin_nhan" AS ENUM ('HE_THONG', 'NGUOI_DUNG', 'TRO_LY', 'CONG_CU');

-- CreateEnum
CREATE TYPE "loai_tac_vu_ai" AS ENUM ('CHAT_CHUNG', 'DAT_LICH', 'GOI_Y_LICH', 'TRA_CUU', 'CANH_BAO_THUOC', 'TOM_TAT_HO_SO', 'NHAC_TAI_KHAM');

-- CreateEnum
CREATE TYPE "trang_thai_lan_chay_ai" AS ENUM ('DANG_XU_LY', 'THANH_CONG', 'THAT_BAI');

-- CreateEnum
CREATE TYPE "loai_giam_gia_voucher" AS ENUM ('PHAN_TRAM', 'SO_TIEN_CO_DINH');

-- CreateEnum
CREATE TYPE "trang_thai_voucher" AS ENUM ('BAN_NHAP', 'DANG_HOAT_DONG', 'TAM_DUNG', 'HET_HAN', 'DA_HUY');

-- CreateEnum
CREATE TYPE "trang_thai_dot_phat_hanh" AS ENUM ('BAN_NHAP', 'SAP_DIEN_RA', 'DANG_DIEN_RA', 'DA_KET_THUC', 'TAM_DUNG', 'DA_HUY');

-- CreateEnum
CREATE TYPE "nguon_nhan_voucher" AS ENUM ('SAN_VOUCHER', 'ADMIN_CAP', 'MA_KHUYEN_MAI');

-- CreateEnum
CREATE TYPE "trang_thai_voucher_nguoi_dung" AS ENUM ('CHUA_SU_DUNG', 'DA_SU_DUNG', 'HET_HAN', 'DA_THU_HOI');

-- AlterTable
ALTER TABLE "luot_kham" ADD COLUMN     "lich_hen_id" INTEGER;

-- CreateTable
CREATE TABLE "lich_hen" (
    "id" SERIAL NOT NULL,
    "ma_lich_hen" VARCHAR(30) NOT NULL,
    "benh_nhan_id" INTEGER NOT NULL,
    "chuyen_khoa_id" INTEGER NOT NULL,
    "bac_si_id" INTEGER,
    "phong_kham_id" INTEGER,
    "goi_kham_id" INTEGER,
    "ngay_hen" DATE NOT NULL,
    "gio_bat_dau" TIME(0) NOT NULL,
    "gio_ket_thuc" TIME(0) NOT NULL,
    "nguon_dat_lich" "nguon_dat_lich" NOT NULL,
    "ly_do_kham" TEXT,
    "trieu_chung_ban_dau" TEXT,
    "ghi_chu" TEXT,
    "trang_thai" "trang_thai_lich_hen" NOT NULL DEFAULT 'CHO_XAC_NHAN',
    "nguoi_xac_nhan_id" INTEGER,
    "thoi_gian_xac_nhan" TIMESTAMP(3),
    "ly_do_tu_choi_hoac_huy" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lich_hen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "di_ung_benh_nhan" (
    "id" SERIAL NOT NULL,
    "benh_nhan_id" INTEGER NOT NULL,
    "thuoc_id" INTEGER,
    "hoat_chat_id" INTEGER,
    "tac_nhan_di_ung" VARCHAR(200) NOT NULL,
    "phan_ung" TEXT,
    "muc_do" "muc_do_di_ung" NOT NULL DEFAULT 'CHUA_XAC_DINH',
    "trang_thai_xac_nhan" "trang_thai_xac_nhan_y_te" NOT NULL DEFAULT 'CHUA_XAC_NHAN',
    "nguon_thong_tin" VARCHAR(100),
    "nguoi_ghi_nhan_id" INTEGER,
    "ghi_chu" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "di_ung_benh_nhan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tien_su_benh" (
    "id" SERIAL NOT NULL,
    "benh_nhan_id" INTEGER NOT NULL,
    "ten_benh" VARCHAR(200) NOT NULL,
    "ma_icd" VARCHAR(20),
    "ngay_bat_dau" DATE,
    "ngay_ket_thuc" DATE,
    "dang_dieu_tri" BOOLEAN NOT NULL DEFAULT false,
    "trang_thai_xac_nhan" "trang_thai_xac_nhan_y_te" NOT NULL DEFAULT 'CHUA_XAC_NHAN',
    "mo_ta" TEXT,
    "nguoi_ghi_nhan_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tien_su_benh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hoat_chat" (
    "id" SERIAL NOT NULL,
    "ma_hoat_chat" VARCHAR(30) NOT NULL,
    "ten_hoat_chat" VARCHAR(200) NOT NULL,
    "mo_ta" TEXT,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hoat_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thuoc_hoat_chat" (
    "id" SERIAL NOT NULL,
    "thuoc_id" INTEGER NOT NULL,
    "hoat_chat_id" INTEGER NOT NULL,
    "ham_luong" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thuoc_hoat_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canh_bao_don_thuoc" (
    "id" SERIAL NOT NULL,
    "don_thuoc_id" INTEGER NOT NULL,
    "thuoc_id" INTEGER,
    "hoat_chat_id" INTEGER,
    "loai_canh_bao" "loai_canh_bao_don_thuoc" NOT NULL,
    "muc_do" "muc_do_canh_bao" NOT NULL,
    "nguon_canh_bao" "nguon_canh_bao" NOT NULL,
    "tieu_de" VARCHAR(255) NOT NULL,
    "noi_dung" TEXT NOT NULL,
    "khuyen_nghi" TEXT,
    "du_lieu_bang_chung" JSONB,
    "trang_thai_xu_ly" "trang_thai_xu_ly_canh_bao" NOT NULL DEFAULT 'CHO_XU_LY',
    "nguoi_xu_ly_id" INTEGER,
    "ly_do_xu_ly" TEXT,
    "thoi_gian_xu_ly" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canh_bao_don_thuoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dich_vu" (
    "id" SERIAL NOT NULL,
    "ma_dich_vu" VARCHAR(30) NOT NULL,
    "ten_dich_vu" VARCHAR(200) NOT NULL,
    "mo_ta" TEXT,
    "don_gia" DECIMAL(15,2) NOT NULL,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dich_vu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goi_kham" (
    "id" SERIAL NOT NULL,
    "ma_goi_kham" VARCHAR(30) NOT NULL,
    "ten_goi_kham" VARCHAR(200) NOT NULL,
    "chuyen_khoa_id" INTEGER,
    "mo_ta" TEXT,
    "gia_niem_yet" DECIMAL(15,2) NOT NULL,
    "gia_ban" DECIMAL(15,2) NOT NULL,
    "thoi_han_ngay" INTEGER,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goi_kham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chi_tiet_goi_kham" (
    "id" SERIAL NOT NULL,
    "goi_kham_id" INTEGER NOT NULL,
    "dich_vu_id" INTEGER NOT NULL,
    "so_luong" INTEGER NOT NULL DEFAULT 1,
    "don_gia" DECIMAL(15,2) NOT NULL,
    "ghi_chu" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chi_tiet_goi_kham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chi_tiet_hoa_don" (
    "id" SERIAL NOT NULL,
    "hoa_don_id" INTEGER NOT NULL,
    "dich_vu_id" INTEGER,
    "goi_kham_id" INTEGER,
    "thuoc_id" INTEGER,
    "loai_muc" "loai_muc_hoa_don" NOT NULL,
    "ma_muc" VARCHAR(50),
    "ten_muc" VARCHAR(255) NOT NULL,
    "so_luong" INTEGER NOT NULL DEFAULT 1,
    "don_gia" DECIMAL(15,2) NOT NULL,
    "thanh_tien" DECIMAL(15,2) NOT NULL,
    "ghi_chu" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chi_tiet_hoa_don_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cau_hinh_thue" (
    "id" SERIAL NOT NULL,
    "ma_thue" VARCHAR(30) NOT NULL,
    "ten_thue" VARCHAR(150) NOT NULL,
    "ty_le_phan_tram" DECIMAL(5,2) NOT NULL,
    "ngay_bat_dau" DATE NOT NULL,
    "ngay_ket_thuc" DATE,
    "trang_thai" "trang_thai_chung" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cau_hinh_thue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhac_tai_kham" (
    "id" SERIAL NOT NULL,
    "benh_nhan_id" INTEGER NOT NULL,
    "ho_so_kham_id" INTEGER,
    "lich_hen_id" INTEGER,
    "kenh_gui" "kenh_nhac_tai_kham" NOT NULL,
    "thoi_gian_du_kien" TIMESTAMP(3) NOT NULL,
    "thoi_gian_gui" TIMESTAMP(3),
    "noi_dung" TEXT NOT NULL,
    "trang_thai" "trang_thai_nhac" NOT NULL DEFAULT 'CHO_GUI',
    "so_lan_thu" INTEGER NOT NULL DEFAULT 0,
    "ma_tin_nhan_ngoai" VARCHAR(150),
    "ly_do_that_bai" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nhac_tai_kham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "danh_gia_bac_si" (
    "id" SERIAL NOT NULL,
    "luot_kham_id" INTEGER NOT NULL,
    "benh_nhan_id" INTEGER NOT NULL,
    "bac_si_id" INTEGER NOT NULL,
    "so_sao" INTEGER NOT NULL,
    "noi_dung" TEXT,
    "trang_thai" "trang_thai_danh_gia" NOT NULL DEFAULT 'CHO_DUYET',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "danh_gia_bac_si_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phien_chat" (
    "id" SERIAL NOT NULL,
    "ma_phien" VARCHAR(50) NOT NULL,
    "nguoi_dung_id" INTEGER,
    "benh_nhan_id" INTEGER,
    "loai_phien" "loai_phien_chat" NOT NULL DEFAULT 'TU_VAN_CHUNG',
    "tieu_de" VARCHAR(255),
    "tom_tat_ngu_canh" TEXT,
    "trang_thai" "trang_thai_phien_chat" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "thoi_gian_ket_thuc" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phien_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tin_nhan_chat" (
    "id" SERIAL NOT NULL,
    "phien_chat_id" INTEGER NOT NULL,
    "vai_tro" "vai_tro_tin_nhan" NOT NULL,
    "noi_dung" TEXT NOT NULL,
    "ten_cong_cu" VARCHAR(100),
    "ma_lan_goi_cong_cu" VARCHAR(100),
    "metadata" JSONB,
    "so_token" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tin_nhan_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lan_chay_ai" (
    "id" SERIAL NOT NULL,
    "phien_chat_id" INTEGER,
    "tin_nhan_chat_id" INTEGER,
    "benh_nhan_id" INTEGER,
    "tac_vu" "loai_tac_vu_ai" NOT NULL,
    "nha_cung_cap" VARCHAR(50) NOT NULL DEFAULT 'GOOGLE_GEMINI',
    "ten_model" VARCHAR(100) NOT NULL,
    "trang_thai" "trang_thai_lan_chay_ai" NOT NULL DEFAULT 'DANG_XU_LY',
    "so_token_dau_vao" INTEGER,
    "so_token_dau_ra" INTEGER,
    "do_tre_ms" INTEGER,
    "metadata_yeu_cau" JSONB,
    "ma_loi" VARCHAR(100),
    "thong_bao_loi" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lan_chay_ai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher" (
    "id" SERIAL NOT NULL,
    "ma_voucher" VARCHAR(50) NOT NULL,
    "ten_voucher" VARCHAR(200) NOT NULL,
    "mo_ta" TEXT,
    "loai_giam_gia" "loai_giam_gia_voucher" NOT NULL,
    "gia_tri_giam" DECIMAL(15,2) NOT NULL,
    "giam_toi_da" DECIMAL(15,2),
    "gia_tri_hoa_don_toi_thieu" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gioi_han_moi_nguoi" INTEGER NOT NULL DEFAULT 1,
    "ngay_bat_dau" TIMESTAMP(3) NOT NULL,
    "ngay_ket_thuc" TIMESTAMP(3) NOT NULL,
    "trang_thai" "trang_thai_voucher" NOT NULL DEFAULT 'BAN_NHAP',
    "nguoi_tao_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dot_phat_hanh_voucher" (
    "id" SERIAL NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "ten_dot_phat_hanh" VARCHAR(200) NOT NULL,
    "cong_khai" BOOLEAN NOT NULL DEFAULT true,
    "so_luong_phat_hanh" INTEGER NOT NULL,
    "so_luong_da_nhan" INTEGER NOT NULL DEFAULT 0,
    "thoi_gian_bat_dau" TIMESTAMP(3) NOT NULL,
    "thoi_gian_ket_thuc" TIMESTAMP(3) NOT NULL,
    "trang_thai" "trang_thai_dot_phat_hanh" NOT NULL DEFAULT 'BAN_NHAP',
    "nguoi_tao_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dot_phat_hanh_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_nguoi_dung" (
    "id" SERIAL NOT NULL,
    "voucher_id" INTEGER NOT NULL,
    "dot_phat_hanh_id" INTEGER,
    "nguoi_dung_id" INTEGER NOT NULL,
    "ma_so_huu" VARCHAR(80) NOT NULL,
    "nguon_nhan" "nguon_nhan_voucher" NOT NULL,
    "trang_thai" "trang_thai_voucher_nguoi_dung" NOT NULL DEFAULT 'CHUA_SU_DUNG',
    "thoi_gian_nhan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "het_han_luc" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voucher_nguoi_dung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "su_dung_voucher" (
    "id" SERIAL NOT NULL,
    "voucher_nguoi_dung_id" INTEGER NOT NULL,
    "hoa_don_id" INTEGER NOT NULL,
    "so_tien_giam" DECIMAL(15,2) NOT NULL,
    "thoi_gian_su_dung" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "su_dung_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lich_hen_ma_lich_hen_key" ON "lich_hen"("ma_lich_hen");

-- CreateIndex
CREATE INDEX "lich_hen_benh_nhan_id_idx" ON "lich_hen"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "lich_hen_chuyen_khoa_id_idx" ON "lich_hen"("chuyen_khoa_id");

-- CreateIndex
CREATE INDEX "lich_hen_bac_si_id_idx" ON "lich_hen"("bac_si_id");

-- CreateIndex
CREATE INDEX "lich_hen_phong_kham_id_idx" ON "lich_hen"("phong_kham_id");

-- CreateIndex
CREATE INDEX "lich_hen_goi_kham_id_idx" ON "lich_hen"("goi_kham_id");

-- CreateIndex
CREATE INDEX "lich_hen_ngay_hen_trang_thai_idx" ON "lich_hen"("ngay_hen", "trang_thai");

-- CreateIndex
CREATE INDEX "lich_hen_nguoi_xac_nhan_id_idx" ON "lich_hen"("nguoi_xac_nhan_id");

-- CreateIndex
CREATE INDEX "di_ung_benh_nhan_benh_nhan_id_idx" ON "di_ung_benh_nhan"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "di_ung_benh_nhan_thuoc_id_idx" ON "di_ung_benh_nhan"("thuoc_id");

-- CreateIndex
CREATE INDEX "di_ung_benh_nhan_hoat_chat_id_idx" ON "di_ung_benh_nhan"("hoat_chat_id");

-- CreateIndex
CREATE INDEX "di_ung_benh_nhan_nguoi_ghi_nhan_id_idx" ON "di_ung_benh_nhan"("nguoi_ghi_nhan_id");

-- CreateIndex
CREATE INDEX "tien_su_benh_benh_nhan_id_idx" ON "tien_su_benh"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "tien_su_benh_ten_benh_idx" ON "tien_su_benh"("ten_benh");

-- CreateIndex
CREATE INDEX "tien_su_benh_nguoi_ghi_nhan_id_idx" ON "tien_su_benh"("nguoi_ghi_nhan_id");

-- CreateIndex
CREATE UNIQUE INDEX "hoat_chat_ma_hoat_chat_key" ON "hoat_chat"("ma_hoat_chat");

-- CreateIndex
CREATE UNIQUE INDEX "hoat_chat_ten_hoat_chat_key" ON "hoat_chat"("ten_hoat_chat");

-- CreateIndex
CREATE INDEX "hoat_chat_ten_hoat_chat_idx" ON "hoat_chat"("ten_hoat_chat");

-- CreateIndex
CREATE INDEX "thuoc_hoat_chat_hoat_chat_id_idx" ON "thuoc_hoat_chat"("hoat_chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "thuoc_hoat_chat_thuoc_id_hoat_chat_id_key" ON "thuoc_hoat_chat"("thuoc_id", "hoat_chat_id");

-- CreateIndex
CREATE INDEX "canh_bao_don_thuoc_don_thuoc_id_idx" ON "canh_bao_don_thuoc"("don_thuoc_id");

-- CreateIndex
CREATE INDEX "canh_bao_don_thuoc_thuoc_id_idx" ON "canh_bao_don_thuoc"("thuoc_id");

-- CreateIndex
CREATE INDEX "canh_bao_don_thuoc_hoat_chat_id_idx" ON "canh_bao_don_thuoc"("hoat_chat_id");

-- CreateIndex
CREATE INDEX "canh_bao_don_thuoc_trang_thai_xu_ly_idx" ON "canh_bao_don_thuoc"("trang_thai_xu_ly");

-- CreateIndex
CREATE INDEX "canh_bao_don_thuoc_nguoi_xu_ly_id_idx" ON "canh_bao_don_thuoc"("nguoi_xu_ly_id");

-- CreateIndex
CREATE UNIQUE INDEX "dich_vu_ma_dich_vu_key" ON "dich_vu"("ma_dich_vu");

-- CreateIndex
CREATE INDEX "dich_vu_ten_dich_vu_idx" ON "dich_vu"("ten_dich_vu");

-- CreateIndex
CREATE INDEX "dich_vu_trang_thai_idx" ON "dich_vu"("trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "goi_kham_ma_goi_kham_key" ON "goi_kham"("ma_goi_kham");

-- CreateIndex
CREATE INDEX "goi_kham_chuyen_khoa_id_idx" ON "goi_kham"("chuyen_khoa_id");

-- CreateIndex
CREATE INDEX "goi_kham_ten_goi_kham_idx" ON "goi_kham"("ten_goi_kham");

-- CreateIndex
CREATE INDEX "goi_kham_trang_thai_idx" ON "goi_kham"("trang_thai");

-- CreateIndex
CREATE INDEX "chi_tiet_goi_kham_dich_vu_id_idx" ON "chi_tiet_goi_kham"("dich_vu_id");

-- CreateIndex
CREATE UNIQUE INDEX "chi_tiet_goi_kham_goi_kham_id_dich_vu_id_key" ON "chi_tiet_goi_kham"("goi_kham_id", "dich_vu_id");

-- CreateIndex
CREATE INDEX "chi_tiet_hoa_don_hoa_don_id_idx" ON "chi_tiet_hoa_don"("hoa_don_id");

-- CreateIndex
CREATE INDEX "chi_tiet_hoa_don_dich_vu_id_idx" ON "chi_tiet_hoa_don"("dich_vu_id");

-- CreateIndex
CREATE INDEX "chi_tiet_hoa_don_goi_kham_id_idx" ON "chi_tiet_hoa_don"("goi_kham_id");

-- CreateIndex
CREATE INDEX "chi_tiet_hoa_don_thuoc_id_idx" ON "chi_tiet_hoa_don"("thuoc_id");

-- CreateIndex
CREATE UNIQUE INDEX "cau_hinh_thue_ma_thue_key" ON "cau_hinh_thue"("ma_thue");

-- CreateIndex
CREATE INDEX "cau_hinh_thue_ngay_bat_dau_ngay_ket_thuc_idx" ON "cau_hinh_thue"("ngay_bat_dau", "ngay_ket_thuc");

-- CreateIndex
CREATE INDEX "nhac_tai_kham_benh_nhan_id_idx" ON "nhac_tai_kham"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "nhac_tai_kham_ho_so_kham_id_idx" ON "nhac_tai_kham"("ho_so_kham_id");

-- CreateIndex
CREATE INDEX "nhac_tai_kham_lich_hen_id_idx" ON "nhac_tai_kham"("lich_hen_id");

-- CreateIndex
CREATE INDEX "nhac_tai_kham_trang_thai_thoi_gian_du_kien_idx" ON "nhac_tai_kham"("trang_thai", "thoi_gian_du_kien");

-- CreateIndex
CREATE UNIQUE INDEX "danh_gia_bac_si_luot_kham_id_key" ON "danh_gia_bac_si"("luot_kham_id");

-- CreateIndex
CREATE INDEX "danh_gia_bac_si_benh_nhan_id_idx" ON "danh_gia_bac_si"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "danh_gia_bac_si_bac_si_id_trang_thai_idx" ON "danh_gia_bac_si"("bac_si_id", "trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "phien_chat_ma_phien_key" ON "phien_chat"("ma_phien");

-- CreateIndex
CREATE INDEX "phien_chat_nguoi_dung_id_idx" ON "phien_chat"("nguoi_dung_id");

-- CreateIndex
CREATE INDEX "phien_chat_benh_nhan_id_idx" ON "phien_chat"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "phien_chat_trang_thai_idx" ON "phien_chat"("trang_thai");

-- CreateIndex
CREATE INDEX "tin_nhan_chat_phien_chat_id_created_at_idx" ON "tin_nhan_chat"("phien_chat_id", "created_at");

-- CreateIndex
CREATE INDEX "lan_chay_ai_phien_chat_id_idx" ON "lan_chay_ai"("phien_chat_id");

-- CreateIndex
CREATE INDEX "lan_chay_ai_tin_nhan_chat_id_idx" ON "lan_chay_ai"("tin_nhan_chat_id");

-- CreateIndex
CREATE INDEX "lan_chay_ai_benh_nhan_id_idx" ON "lan_chay_ai"("benh_nhan_id");

-- CreateIndex
CREATE INDEX "lan_chay_ai_tac_vu_trang_thai_idx" ON "lan_chay_ai"("tac_vu", "trang_thai");

-- CreateIndex
CREATE INDEX "lan_chay_ai_created_at_idx" ON "lan_chay_ai"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_ma_voucher_key" ON "voucher"("ma_voucher");

-- CreateIndex
CREATE INDEX "voucher_trang_thai_ngay_bat_dau_ngay_ket_thuc_idx" ON "voucher"("trang_thai", "ngay_bat_dau", "ngay_ket_thuc");

-- CreateIndex
CREATE INDEX "voucher_nguoi_tao_id_idx" ON "voucher"("nguoi_tao_id");

-- CreateIndex
CREATE INDEX "dot_phat_hanh_voucher_voucher_id_idx" ON "dot_phat_hanh_voucher"("voucher_id");

-- CreateIndex
CREATE INDEX "dot_phat_hanh_voucher_trang_thai_thoi_gian_bat_dau_thoi_gia_idx" ON "dot_phat_hanh_voucher"("trang_thai", "thoi_gian_bat_dau", "thoi_gian_ket_thuc");

-- CreateIndex
CREATE INDEX "dot_phat_hanh_voucher_nguoi_tao_id_idx" ON "dot_phat_hanh_voucher"("nguoi_tao_id");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_nguoi_dung_ma_so_huu_key" ON "voucher_nguoi_dung"("ma_so_huu");

-- CreateIndex
CREATE INDEX "voucher_nguoi_dung_voucher_id_idx" ON "voucher_nguoi_dung"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_nguoi_dung_dot_phat_hanh_id_idx" ON "voucher_nguoi_dung"("dot_phat_hanh_id");

-- CreateIndex
CREATE INDEX "voucher_nguoi_dung_nguoi_dung_id_trang_thai_idx" ON "voucher_nguoi_dung"("nguoi_dung_id", "trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "su_dung_voucher_voucher_nguoi_dung_id_key" ON "su_dung_voucher"("voucher_nguoi_dung_id");

-- CreateIndex
CREATE UNIQUE INDEX "su_dung_voucher_hoa_don_id_key" ON "su_dung_voucher"("hoa_don_id");

-- CreateIndex
CREATE INDEX "su_dung_voucher_thoi_gian_su_dung_idx" ON "su_dung_voucher"("thoi_gian_su_dung");

-- CreateIndex
CREATE UNIQUE INDEX "luot_kham_lich_hen_id_key" ON "luot_kham"("lich_hen_id");

-- CreateIndex
CREATE INDEX "luot_kham_lich_hen_id_idx" ON "luot_kham"("lich_hen_id");

-- AddForeignKey
ALTER TABLE "luot_kham" ADD CONSTRAINT "luot_kham_lich_hen_id_fkey" FOREIGN KEY ("lich_hen_id") REFERENCES "lich_hen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_hen" ADD CONSTRAINT "lich_hen_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_hen" ADD CONSTRAINT "lich_hen_chuyen_khoa_id_fkey" FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_hen" ADD CONSTRAINT "lich_hen_bac_si_id_fkey" FOREIGN KEY ("bac_si_id") REFERENCES "bac_si"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_hen" ADD CONSTRAINT "lich_hen_phong_kham_id_fkey" FOREIGN KEY ("phong_kham_id") REFERENCES "phong_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_hen" ADD CONSTRAINT "lich_hen_goi_kham_id_fkey" FOREIGN KEY ("goi_kham_id") REFERENCES "goi_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_hen" ADD CONSTRAINT "lich_hen_nguoi_xac_nhan_id_fkey" FOREIGN KEY ("nguoi_xac_nhan_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "di_ung_benh_nhan" ADD CONSTRAINT "di_ung_benh_nhan_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "di_ung_benh_nhan" ADD CONSTRAINT "di_ung_benh_nhan_thuoc_id_fkey" FOREIGN KEY ("thuoc_id") REFERENCES "thuoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "di_ung_benh_nhan" ADD CONSTRAINT "di_ung_benh_nhan_hoat_chat_id_fkey" FOREIGN KEY ("hoat_chat_id") REFERENCES "hoat_chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "di_ung_benh_nhan" ADD CONSTRAINT "di_ung_benh_nhan_nguoi_ghi_nhan_id_fkey" FOREIGN KEY ("nguoi_ghi_nhan_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tien_su_benh" ADD CONSTRAINT "tien_su_benh_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tien_su_benh" ADD CONSTRAINT "tien_su_benh_nguoi_ghi_nhan_id_fkey" FOREIGN KEY ("nguoi_ghi_nhan_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thuoc_hoat_chat" ADD CONSTRAINT "thuoc_hoat_chat_thuoc_id_fkey" FOREIGN KEY ("thuoc_id") REFERENCES "thuoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thuoc_hoat_chat" ADD CONSTRAINT "thuoc_hoat_chat_hoat_chat_id_fkey" FOREIGN KEY ("hoat_chat_id") REFERENCES "hoat_chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canh_bao_don_thuoc" ADD CONSTRAINT "canh_bao_don_thuoc_don_thuoc_id_fkey" FOREIGN KEY ("don_thuoc_id") REFERENCES "don_thuoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canh_bao_don_thuoc" ADD CONSTRAINT "canh_bao_don_thuoc_thuoc_id_fkey" FOREIGN KEY ("thuoc_id") REFERENCES "thuoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canh_bao_don_thuoc" ADD CONSTRAINT "canh_bao_don_thuoc_hoat_chat_id_fkey" FOREIGN KEY ("hoat_chat_id") REFERENCES "hoat_chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canh_bao_don_thuoc" ADD CONSTRAINT "canh_bao_don_thuoc_nguoi_xu_ly_id_fkey" FOREIGN KEY ("nguoi_xu_ly_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goi_kham" ADD CONSTRAINT "goi_kham_chuyen_khoa_id_fkey" FOREIGN KEY ("chuyen_khoa_id") REFERENCES "chuyen_khoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_goi_kham" ADD CONSTRAINT "chi_tiet_goi_kham_goi_kham_id_fkey" FOREIGN KEY ("goi_kham_id") REFERENCES "goi_kham"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_goi_kham" ADD CONSTRAINT "chi_tiet_goi_kham_dich_vu_id_fkey" FOREIGN KEY ("dich_vu_id") REFERENCES "dich_vu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_hoa_don" ADD CONSTRAINT "chi_tiet_hoa_don_hoa_don_id_fkey" FOREIGN KEY ("hoa_don_id") REFERENCES "hoa_don"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_hoa_don" ADD CONSTRAINT "chi_tiet_hoa_don_dich_vu_id_fkey" FOREIGN KEY ("dich_vu_id") REFERENCES "dich_vu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_hoa_don" ADD CONSTRAINT "chi_tiet_hoa_don_goi_kham_id_fkey" FOREIGN KEY ("goi_kham_id") REFERENCES "goi_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chi_tiet_hoa_don" ADD CONSTRAINT "chi_tiet_hoa_don_thuoc_id_fkey" FOREIGN KEY ("thuoc_id") REFERENCES "thuoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhac_tai_kham" ADD CONSTRAINT "nhac_tai_kham_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhac_tai_kham" ADD CONSTRAINT "nhac_tai_kham_ho_so_kham_id_fkey" FOREIGN KEY ("ho_so_kham_id") REFERENCES "ho_so_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhac_tai_kham" ADD CONSTRAINT "nhac_tai_kham_lich_hen_id_fkey" FOREIGN KEY ("lich_hen_id") REFERENCES "lich_hen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_gia_bac_si" ADD CONSTRAINT "danh_gia_bac_si_luot_kham_id_fkey" FOREIGN KEY ("luot_kham_id") REFERENCES "luot_kham"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_gia_bac_si" ADD CONSTRAINT "danh_gia_bac_si_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_gia_bac_si" ADD CONSTRAINT "danh_gia_bac_si_bac_si_id_fkey" FOREIGN KEY ("bac_si_id") REFERENCES "bac_si"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phien_chat" ADD CONSTRAINT "phien_chat_nguoi_dung_id_fkey" FOREIGN KEY ("nguoi_dung_id") REFERENCES "nguoi_dung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phien_chat" ADD CONSTRAINT "phien_chat_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tin_nhan_chat" ADD CONSTRAINT "tin_nhan_chat_phien_chat_id_fkey" FOREIGN KEY ("phien_chat_id") REFERENCES "phien_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lan_chay_ai" ADD CONSTRAINT "lan_chay_ai_phien_chat_id_fkey" FOREIGN KEY ("phien_chat_id") REFERENCES "phien_chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lan_chay_ai" ADD CONSTRAINT "lan_chay_ai_tin_nhan_chat_id_fkey" FOREIGN KEY ("tin_nhan_chat_id") REFERENCES "tin_nhan_chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lan_chay_ai" ADD CONSTRAINT "lan_chay_ai_benh_nhan_id_fkey" FOREIGN KEY ("benh_nhan_id") REFERENCES "benh_nhan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dot_phat_hanh_voucher" ADD CONSTRAINT "dot_phat_hanh_voucher_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dot_phat_hanh_voucher" ADD CONSTRAINT "dot_phat_hanh_voucher_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_nguoi_dung" ADD CONSTRAINT "voucher_nguoi_dung_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_nguoi_dung" ADD CONSTRAINT "voucher_nguoi_dung_dot_phat_hanh_id_fkey" FOREIGN KEY ("dot_phat_hanh_id") REFERENCES "dot_phat_hanh_voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_nguoi_dung" ADD CONSTRAINT "voucher_nguoi_dung_nguoi_dung_id_fkey" FOREIGN KEY ("nguoi_dung_id") REFERENCES "nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "su_dung_voucher" ADD CONSTRAINT "su_dung_voucher_voucher_nguoi_dung_id_fkey" FOREIGN KEY ("voucher_nguoi_dung_id") REFERENCES "voucher_nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "su_dung_voucher" ADD CONSTRAINT "su_dung_voucher_hoa_don_id_fkey" FOREIGN KEY ("hoa_don_id") REFERENCES "hoa_don"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business integrity checks not expressible in the Prisma schema.
ALTER TABLE "lich_hen"
  ADD CONSTRAINT "lich_hen_khung_gio_hop_le" CHECK ("gio_ket_thuc" > "gio_bat_dau");

ALTER TABLE "dich_vu"
  ADD CONSTRAINT "dich_vu_don_gia_khong_am" CHECK ("don_gia" >= 0);

ALTER TABLE "goi_kham"
  ADD CONSTRAINT "goi_kham_gia_hop_le" CHECK ("gia_niem_yet" >= 0 AND "gia_ban" >= 0),
  ADD CONSTRAINT "goi_kham_thoi_han_hop_le" CHECK ("thoi_han_ngay" IS NULL OR "thoi_han_ngay" > 0);

ALTER TABLE "chi_tiet_goi_kham"
  ADD CONSTRAINT "chi_tiet_goi_kham_so_luong_hop_le" CHECK ("so_luong" > 0),
  ADD CONSTRAINT "chi_tiet_goi_kham_don_gia_khong_am" CHECK ("don_gia" >= 0);

ALTER TABLE "chi_tiet_hoa_don"
  ADD CONSTRAINT "chi_tiet_hoa_don_so_luong_hop_le" CHECK ("so_luong" > 0),
  ADD CONSTRAINT "chi_tiet_hoa_don_so_tien_khong_am" CHECK ("don_gia" >= 0 AND "thanh_tien" >= 0),
  ADD CONSTRAINT "chi_tiet_hoa_don_mot_tham_chieu" CHECK (num_nonnulls("dich_vu_id", "goi_kham_id", "thuoc_id") <= 1);

ALTER TABLE "cau_hinh_thue"
  ADD CONSTRAINT "cau_hinh_thue_ty_le_hop_le" CHECK ("ty_le_phan_tram" >= 0 AND "ty_le_phan_tram" <= 100),
  ADD CONSTRAINT "cau_hinh_thue_thoi_gian_hop_le" CHECK ("ngay_ket_thuc" IS NULL OR "ngay_ket_thuc" >= "ngay_bat_dau");

ALTER TABLE "danh_gia_bac_si"
  ADD CONSTRAINT "danh_gia_bac_si_so_sao_hop_le" CHECK ("so_sao" BETWEEN 1 AND 5);

ALTER TABLE "voucher"
  ADD CONSTRAINT "voucher_gia_tri_hop_le" CHECK (
    "gia_tri_giam" > 0
    AND ("loai_giam_gia" <> 'PHAN_TRAM' OR "gia_tri_giam" <= 100)
    AND ("giam_toi_da" IS NULL OR "giam_toi_da" > 0)
    AND "gia_tri_hoa_don_toi_thieu" >= 0
  ),
  ADD CONSTRAINT "voucher_gioi_han_hop_le" CHECK ("gioi_han_moi_nguoi" > 0),
  ADD CONSTRAINT "voucher_thoi_gian_hop_le" CHECK ("ngay_ket_thuc" > "ngay_bat_dau");

ALTER TABLE "dot_phat_hanh_voucher"
  ADD CONSTRAINT "dot_phat_hanh_voucher_so_luong_hop_le" CHECK (
    "so_luong_phat_hanh" > 0
    AND "so_luong_da_nhan" >= 0
    AND "so_luong_da_nhan" <= "so_luong_phat_hanh"
  ),
  ADD CONSTRAINT "dot_phat_hanh_voucher_thoi_gian_hop_le" CHECK ("thoi_gian_ket_thuc" > "thoi_gian_bat_dau");

ALTER TABLE "voucher_nguoi_dung"
  ADD CONSTRAINT "voucher_nguoi_dung_han_hop_le" CHECK ("het_han_luc" >= "thoi_gian_nhan");

ALTER TABLE "su_dung_voucher"
  ADD CONSTRAINT "su_dung_voucher_so_tien_hop_le" CHECK ("so_tien_giam" > 0);
