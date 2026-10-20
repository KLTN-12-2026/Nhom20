-- Chuyển nhắc tái khám sang danh sách gọi thủ công của Lễ tân.
-- Bảng nhac_tai_kham đã được kiểm tra là trống trước khi migration này được tạo.
DROP TABLE IF EXISTS "nhac_tai_kham";
DROP TYPE IF EXISTS "kenh_nhac_tai_kham";
DROP TYPE IF EXISTS "trang_thai_nhac";
