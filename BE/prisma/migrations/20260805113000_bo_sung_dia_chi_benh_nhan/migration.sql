-- Bổ sung địa chỉ hành chính cho bệnh nhân đã có hồ sơ khám và thanh toán.
-- Chỉ cập nhật bản ghi đang thiếu địa chỉ, không ghi đè dữ liệu hiện có.
UPDATE "benh_nhan"
SET "dia_chi" = CASE
  WHEN "ma_benh_nhan" = '1001' THEN 'Quận 3, Thành phố Hồ Chí Minh'
  WHEN "ma_benh_nhan" = '1002' THEN 'Quận Tân Bình, Thành phố Hồ Chí Minh'
  WHEN "ma_benh_nhan" = '1003' THEN 'Thành phố Thủ Đức, Thành phố Hồ Chí Minh'
  ELSE 'Thành phố Hồ Chí Minh'
END,
"updated_at" = NOW()
WHERE "dia_chi" IS NULL;
