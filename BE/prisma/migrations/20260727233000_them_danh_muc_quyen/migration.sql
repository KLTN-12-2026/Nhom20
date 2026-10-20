INSERT INTO "quyen" (
  "ma_quyen",
  "ten_quyen",
  "phan_he",
  "mo_ta",
  "updated_at"
)
VALUES
  ('NGUOI_DUNG.VIEW', 'Xem người dùng', 'NGUOI_DUNG', 'Xem danh sách và chi tiết người dùng', CURRENT_TIMESTAMP),
  ('NGUOI_DUNG.CREATE', 'Thêm người dùng', 'NGUOI_DUNG', 'Tạo tài khoản người dùng', CURRENT_TIMESTAMP),
  ('NGUOI_DUNG.UPDATE', 'Sửa người dùng', 'NGUOI_DUNG', 'Cập nhật thông tin người dùng', CURRENT_TIMESTAMP),
  ('NGUOI_DUNG.DELETE', 'Xóa người dùng', 'NGUOI_DUNG', 'Xóa tài khoản người dùng', CURRENT_TIMESTAMP),
  ('BENH_AN.VIEW', 'Xem hồ sơ bệnh án', 'BENH_AN', 'Xem hồ sơ bệnh án', CURRENT_TIMESTAMP),
  ('BENH_AN.CREATE', 'Thêm hồ sơ bệnh án', 'BENH_AN', 'Tạo hồ sơ bệnh án', CURRENT_TIMESTAMP),
  ('BENH_AN.UPDATE', 'Sửa hồ sơ bệnh án', 'BENH_AN', 'Cập nhật hồ sơ bệnh án', CURRENT_TIMESTAMP),
  ('BENH_AN.DELETE', 'Xóa hồ sơ bệnh án', 'BENH_AN', 'Xóa hồ sơ bệnh án', CURRENT_TIMESTAMP),
  ('LICH_HEN.VIEW', 'Xem lịch hẹn', 'LICH_HEN', 'Xem lịch hẹn', CURRENT_TIMESTAMP),
  ('LICH_HEN.CREATE', 'Thêm lịch hẹn', 'LICH_HEN', 'Tạo lịch hẹn', CURRENT_TIMESTAMP),
  ('LICH_HEN.UPDATE', 'Sửa lịch hẹn', 'LICH_HEN', 'Cập nhật lịch hẹn', CURRENT_TIMESTAMP),
  ('LICH_HEN.DELETE', 'Xóa lịch hẹn', 'LICH_HEN', 'Xóa lịch hẹn', CURRENT_TIMESTAMP),
  ('THUOC.VIEW', 'Xem thuốc', 'THUOC', 'Xem danh mục thuốc', CURRENT_TIMESTAMP),
  ('THUOC.CREATE', 'Thêm thuốc', 'THUOC', 'Thêm thuốc', CURRENT_TIMESTAMP),
  ('THUOC.UPDATE', 'Sửa thuốc', 'THUOC', 'Cập nhật thuốc', CURRENT_TIMESTAMP),
  ('THUOC.DELETE', 'Xóa thuốc', 'THUOC', 'Xóa thuốc', CURRENT_TIMESTAMP),
  ('HOA_DON.VIEW', 'Xem hóa đơn', 'HOA_DON', 'Xem hóa đơn và thanh toán', CURRENT_TIMESTAMP),
  ('HOA_DON.CREATE', 'Thêm hóa đơn', 'HOA_DON', 'Tạo hóa đơn', CURRENT_TIMESTAMP),
  ('HOA_DON.UPDATE', 'Sửa hóa đơn', 'HOA_DON', 'Cập nhật hóa đơn', CURRENT_TIMESTAMP),
  ('HOA_DON.DELETE', 'Xóa hóa đơn', 'HOA_DON', 'Xóa hóa đơn', CURRENT_TIMESTAMP)
ON CONFLICT ("ma_quyen") DO UPDATE
SET
  "ten_quyen" = EXCLUDED."ten_quyen",
  "phan_he" = EXCLUDED."phan_he",
  "mo_ta" = EXCLUDED."mo_ta",
  "updated_at" = CURRENT_TIMESTAMP;
