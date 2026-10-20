-- Tạm hoãn các tính năng voucher, săn voucher và cấu hình thuế.
-- Các bảng voucher đã được xác nhận chưa có dữ liệu trước khi tạo migration.

DROP TABLE IF EXISTS "su_dung_voucher";
DROP TABLE IF EXISTS "voucher_nguoi_dung";
DROP TABLE IF EXISTS "dot_phat_hanh_voucher";
DROP TABLE IF EXISTS "voucher";
DROP TABLE IF EXISTS "cau_hinh_thue";

DROP TYPE IF EXISTS "trang_thai_voucher_nguoi_dung";
DROP TYPE IF EXISTS "nguon_nhan_voucher";
DROP TYPE IF EXISTS "trang_thai_dot_phat_hanh";
DROP TYPE IF EXISTS "trang_thai_voucher";
DROP TYPE IF EXISTS "loai_giam_gia_voucher";
