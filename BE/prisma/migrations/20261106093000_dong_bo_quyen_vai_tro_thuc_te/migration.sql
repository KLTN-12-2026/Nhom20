-- Đồng bộ quyền mặc định với các API/nghiệp vụ đang tồn tại.
-- Không xóa cấu hình đã được quản trị viên tự bổ sung trước đó.
INSERT INTO "vai_tro_quyen" ("vai_tro_id", "quyen_id", "updated_at")
SELECT vai_tro.id, quyen.id, CURRENT_TIMESTAMP
FROM "vai_tro" AS vai_tro
JOIN "quyen" AS quyen ON (
  (vai_tro."ma_vai_tro" = 'ADMIN' AND quyen."phan_he" IN (
    'NGUOI_DUNG', 'BAC_SI', 'BENH_NHAN', 'BENH_AN', 'CHUYEN_KHOA',
    'DICH_VU', 'THUOC', 'LICH_HEN', 'TIEP_DON', 'HOA_DON', 'CAP_THUOC',
    'LICH_LAM_VIEC', 'BAN_GIAO_CA', 'BAO_CAO', 'DANH_GIA_BAC_SI',
    'CHATBOX_AI', 'NHAT_KY_HE_THONG', 'VAI_TRO'
  ))
  OR (vai_tro."ma_vai_tro" = 'DOCTOR' AND quyen."ma_quyen" IN (
    'LICH_HEN.VIEW', 'BENH_AN.VIEW', 'THUOC.VIEW',
    'LICH_LAM_VIEC.VIEW', 'LICH_LAM_VIEC.UPDATE'
  ))
  OR (vai_tro."ma_vai_tro" = 'PHARMACIST' AND quyen."ma_quyen" IN (
    'CAP_THUOC.VIEW', 'CAP_THUOC.UPDATE',
    'THUOC.VIEW', 'THUOC.CREATE', 'THUOC.UPDATE', 'THUOC.DELETE',
    'LICH_LAM_VIEC.VIEW', 'LICH_LAM_VIEC.UPDATE'
  ))
  OR (vai_tro."ma_vai_tro" = 'RECEPTIONIST' AND quyen."ma_quyen" IN (
    'TIEP_DON.VIEW', 'TIEP_DON.CREATE',
    'LICH_HEN.VIEW', 'LICH_HEN.CREATE', 'LICH_HEN.UPDATE', 'LICH_HEN.DELETE',
    'BENH_NHAN.VIEW', 'HOA_DON.VIEW', 'HOA_DON.UPDATE',
    'BAN_GIAO_CA.VIEW', 'BAN_GIAO_CA.CREATE', 'BAN_GIAO_CA.UPDATE',
    'LICH_LAM_VIEC.VIEW', 'LICH_LAM_VIEC.UPDATE'
  ))
)
ON CONFLICT ("vai_tro_id", "quyen_id") DO NOTHING;
