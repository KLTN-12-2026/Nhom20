-- Đồng bộ bốn vai trò hệ thống; không thay đổi vai trò bệnh nhân hoặc vai trò tùy chỉnh.
-- Các lựa chọn phân quyền cũ của bốn vai trò này được thay bằng ma trận nghiệp vụ.
BEGIN;

INSERT INTO "vai_tro" ("ma_vai_tro", "ten_vai_tro", "updated_at") VALUES
  ('ADMIN', 'Quản trị viên', CURRENT_TIMESTAMP),
  ('DOCTOR', 'Bác sĩ', CURRENT_TIMESTAMP),
  ('PHARMACIST', 'Dược sĩ', CURRENT_TIMESTAMP),
  ('RECEPTIONIST', 'Lễ tân / Thu ngân', CURRENT_TIMESTAMP)
ON CONFLICT ("ma_vai_tro") DO NOTHING;
DELETE FROM "vai_tro_quyen"
WHERE "vai_tro_id" IN (
  SELECT id FROM "vai_tro" WHERE "ma_vai_tro" IN ('ADMIN', 'DOCTOR', 'PHARMACIST', 'RECEPTIONIST')
);

INSERT INTO "vai_tro_quyen" ("vai_tro_id", "quyen_id", "updated_at")
SELECT v.id, q.id, CURRENT_TIMESTAMP
FROM "vai_tro" v
JOIN "quyen" q ON (
  (v.ma_vai_tro = 'ADMIN' AND (
    (q.phan_he IN ('NGUOI_DUNG', 'BAC_SI', 'CHUYEN_KHOA', 'DICH_VU', 'VAI_TRO')
      AND q.ma_quyen IN (q.phan_he || '.VIEW', q.phan_he || '.CREATE', q.phan_he || '.UPDATE', q.phan_he || '.DELETE'))
    OR q.ma_quyen IN ('THUOC.VIEW', 'BENH_AN.VIEW', 'CAP_THUOC.VIEW', 'HOA_DON.VIEW', 'BAO_CAO.VIEW', 'NHAT_KY_HE_THONG.VIEW', 'CHATBOX_AI.VIEW')
  ))
  OR (v.ma_vai_tro = 'DOCTOR' AND q.ma_quyen IN ('LICH_HEN.VIEW', 'BENH_AN.VIEW', 'THUOC.VIEW', 'LICH_LAM_VIEC.VIEW', 'LICH_LAM_VIEC.UPDATE'))
  OR (v.ma_vai_tro = 'PHARMACIST' AND q.ma_quyen IN ('THUOC.VIEW', 'THUOC.CREATE', 'THUOC.UPDATE', 'THUOC.DELETE', 'CAP_THUOC.VIEW', 'CAP_THUOC.UPDATE', 'LICH_LAM_VIEC.VIEW', 'LICH_LAM_VIEC.UPDATE'))
  OR (v.ma_vai_tro = 'RECEPTIONIST' AND q.ma_quyen IN ('TIEP_DON.VIEW', 'TIEP_DON.CREATE', 'LICH_HEN.VIEW', 'LICH_HEN.CREATE', 'LICH_HEN.UPDATE', 'LICH_HEN.DELETE', 'BENH_NHAN.VIEW', 'BENH_NHAN.CREATE', 'HOA_DON.VIEW', 'HOA_DON.UPDATE', 'BAN_GIAO_CA.VIEW', 'BAN_GIAO_CA.CREATE', 'BAN_GIAO_CA.UPDATE', 'LICH_LAM_VIEC.VIEW', 'LICH_LAM_VIEC.UPDATE'))
)
ON CONFLICT ("vai_tro_id", "quyen_id") DO NOTHING;

COMMIT;
