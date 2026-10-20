-- Chuẩn hoá ca làm việc theo quy trình phòng khám:
-- Ca hành chính: 07:00–16:30 mỗi ngày.
-- Ca trực đêm: 16:30–07:00 ngày hôm sau.
-- Ngày nghỉ bù sau ca trực được suy ra ở API, không tạo thêm một loại ca.

INSERT INTO "ca_lam_viec" (
  "ma_ca", "ten_ca", "gio_bat_dau", "gio_ket_thuc", "qua_ngay", "mo_ta", "created_at", "updated_at"
)
VALUES
  ('SANG', 'Ca hành chính', TIME '07:00', TIME '16:30', false, 'Làm việc hành chính từ 07:00 đến 16:30', NOW(), NOW()),
  ('TRUC_DEM', 'Ca trực đêm', TIME '16:30', TIME '07:00', true, 'Trực từ 16:30 đến 07:00 ngày hôm sau', NOW(), NOW())
ON CONFLICT ("ma_ca") DO UPDATE SET
  "ten_ca" = EXCLUDED."ten_ca",
  "gio_bat_dau" = EXCLUDED."gio_bat_dau",
  "gio_ket_thuc" = EXCLUDED."gio_ket_thuc",
  "qua_ngay" = EXCLUDED."qua_ngay",
  "mo_ta" = EXCLUDED."mo_ta",
  "updated_at" = NOW();

-- Các ca cũ không còn thuộc nghiệp vụ. Xoá khi không có phân công tham chiếu;
-- nếu môi trường khác còn dữ liệu lịch cũ thì vô hiệu hoá để không làm mất lịch sử.
DELETE FROM "ca_lam_viec" AS c
WHERE c."ma_ca" IN ('CA_SANG', 'CA_CHIEU', 'CA_TOI')
  AND NOT EXISTS (
    SELECT 1
    FROM "phan_cong_ca" AS p
    WHERE p."ca_lam_viec_id" = c."id"
  );

UPDATE "ca_lam_viec" AS c
SET "trang_thai" = 'NGUNG_HOAT_DONG'
WHERE c."ma_ca" IN ('CA_SANG', 'CA_CHIEU', 'CA_TOI');
