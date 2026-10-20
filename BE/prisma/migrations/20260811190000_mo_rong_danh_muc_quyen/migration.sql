-- Mở rộng danh mục quyền cho các chức năng đã có trong hệ thống.
INSERT INTO "quyen" ("ma_quyen", "ten_quyen", "phan_he", "mo_ta", "updated_at")
VALUES
  ('BAC_SI.VIEW', 'Xem bác sĩ', 'BAC_SI', 'Xem danh sách và thông tin bác sĩ', CURRENT_TIMESTAMP),
  ('BAC_SI.CREATE', 'Thêm bác sĩ', 'BAC_SI', 'Tạo hồ sơ bác sĩ', CURRENT_TIMESTAMP),
  ('BAC_SI.UPDATE', 'Sửa bác sĩ', 'BAC_SI', 'Cập nhật hồ sơ bác sĩ', CURRENT_TIMESTAMP),
  ('BAC_SI.DELETE', 'Xóa bác sĩ', 'BAC_SI', 'Xóa hồ sơ bác sĩ', CURRENT_TIMESTAMP),
  ('BENH_NHAN.VIEW', 'Xem bệnh nhân', 'BENH_NHAN', 'Xem danh sách bệnh nhân', CURRENT_TIMESTAMP),
  ('BENH_NHAN.CREATE', 'Thêm bệnh nhân', 'BENH_NHAN', 'Tạo hồ sơ bệnh nhân', CURRENT_TIMESTAMP),
  ('BENH_NHAN.UPDATE', 'Sửa bệnh nhân', 'BENH_NHAN', 'Cập nhật hồ sơ bệnh nhân', CURRENT_TIMESTAMP),
  ('BENH_NHAN.DELETE', 'Xóa bệnh nhân', 'BENH_NHAN', 'Xóa hồ sơ bệnh nhân', CURRENT_TIMESTAMP),
  ('CHUYEN_KHOA.VIEW', 'Xem chuyên khoa', 'CHUYEN_KHOA', 'Xem danh sách chuyên khoa', CURRENT_TIMESTAMP),
  ('CHUYEN_KHOA.CREATE', 'Thêm chuyên khoa', 'CHUYEN_KHOA', 'Tạo chuyên khoa', CURRENT_TIMESTAMP),
  ('CHUYEN_KHOA.UPDATE', 'Sửa chuyên khoa', 'CHUYEN_KHOA', 'Cập nhật chuyên khoa', CURRENT_TIMESTAMP),
  ('CHUYEN_KHOA.DELETE', 'Xóa chuyên khoa', 'CHUYEN_KHOA', 'Xóa chuyên khoa', CURRENT_TIMESTAMP),
  ('DICH_VU.VIEW', 'Xem dịch vụ', 'DICH_VU', 'Xem danh sách dịch vụ', CURRENT_TIMESTAMP),
  ('DICH_VU.CREATE', 'Thêm dịch vụ', 'DICH_VU', 'Tạo dịch vụ khám', CURRENT_TIMESTAMP),
  ('DICH_VU.UPDATE', 'Sửa dịch vụ', 'DICH_VU', 'Cập nhật dịch vụ khám', CURRENT_TIMESTAMP),
  ('DICH_VU.DELETE', 'Xóa dịch vụ', 'DICH_VU', 'Xóa dịch vụ khám', CURRENT_TIMESTAMP),
  ('TIEP_DON.VIEW', 'Xem tiếp đón', 'TIEP_DON', 'Xem hàng đợi và hồ sơ tiếp đón', CURRENT_TIMESTAMP),
  ('TIEP_DON.CREATE', 'Tiếp nhận bệnh nhân', 'TIEP_DON', 'Tạo lượt tiếp đón', CURRENT_TIMESTAMP),
  ('TIEP_DON.UPDATE', 'Cập nhật tiếp đón', 'TIEP_DON', 'Xác nhận, cấp phiếu và điều chỉnh tiếp đón', CURRENT_TIMESTAMP),
  ('TIEP_DON.DELETE', 'Hủy tiếp đón', 'TIEP_DON', 'Hủy lượt tiếp đón', CURRENT_TIMESTAMP),
  ('CAP_THUOC.VIEW', 'Xem cấp thuốc', 'CAP_THUOC', 'Xem đơn chờ cấp và lịch sử cấp thuốc', CURRENT_TIMESTAMP),
  ('CAP_THUOC.CREATE', 'Cấp thuốc', 'CAP_THUOC', 'Tiếp nhận và cấp thuốc theo đơn', CURRENT_TIMESTAMP),
  ('CAP_THUOC.UPDATE', 'Cập nhật cấp thuốc', 'CAP_THUOC', 'Điều chỉnh trạng thái cấp thuốc', CURRENT_TIMESTAMP),
  ('CAP_THUOC.DELETE', 'Hủy cấp thuốc', 'CAP_THUOC', 'Hủy phiếu cấp thuốc', CURRENT_TIMESTAMP),
  ('LICH_LAM_VIEC.VIEW', 'Xem lịch làm việc', 'LICH_LAM_VIEC', 'Xem lịch làm việc và ca trực', CURRENT_TIMESTAMP),
  ('LICH_LAM_VIEC.CREATE', 'Phân ca', 'LICH_LAM_VIEC', 'Tạo phân công ca làm việc', CURRENT_TIMESTAMP),
  ('LICH_LAM_VIEC.UPDATE', 'Điều chỉnh lịch', 'LICH_LAM_VIEC', 'Cập nhật lịch làm việc và trực đêm', CURRENT_TIMESTAMP),
  ('LICH_LAM_VIEC.DELETE', 'Hủy phân ca', 'LICH_LAM_VIEC', 'Hủy phân công ca làm việc', CURRENT_TIMESTAMP),
  ('BAN_GIAO_CA.VIEW', 'Xem bàn giao ca', 'BAN_GIAO_CA', 'Xem báo cáo và biên bản bàn giao', CURRENT_TIMESTAMP),
  ('BAN_GIAO_CA.CREATE', 'Tạo bàn giao ca', 'BAN_GIAO_CA', 'Tạo và gửi bàn giao ca', CURRENT_TIMESTAMP),
  ('BAN_GIAO_CA.UPDATE', 'Xác nhận bàn giao', 'BAN_GIAO_CA', 'Cập nhật hoặc xác nhận bàn giao ca', CURRENT_TIMESTAMP),
  ('BAN_GIAO_CA.DELETE', 'Hủy bàn giao ca', 'BAN_GIAO_CA', 'Hủy bản nháp hoặc biên bản bàn giao', CURRENT_TIMESTAMP),
  ('BAO_CAO.VIEW', 'Xem báo cáo', 'BAO_CAO', 'Xem báo cáo và thống kê', CURRENT_TIMESTAMP),
  ('BAO_CAO.CREATE', 'Xuất báo cáo', 'BAO_CAO', 'Xuất báo cáo theo khoảng thời gian', CURRENT_TIMESTAMP),
  ('BAO_CAO.UPDATE', 'Cập nhật báo cáo', 'BAO_CAO', 'Cập nhật cấu hình báo cáo', CURRENT_TIMESTAMP),
  ('BAO_CAO.DELETE', 'Xóa báo cáo', 'BAO_CAO', 'Xóa báo cáo đã lưu', CURRENT_TIMESTAMP),
  ('DANH_GIA_BAC_SI.VIEW', 'Xem đánh giá bác sĩ', 'DANH_GIA_BAC_SI', 'Xem đánh giá bác sĩ', CURRENT_TIMESTAMP),
  ('DANH_GIA_BAC_SI.CREATE', 'Gửi đánh giá bác sĩ', 'DANH_GIA_BAC_SI', 'Gửi đánh giá sau lượt khám', CURRENT_TIMESTAMP),
  ('DANH_GIA_BAC_SI.UPDATE', 'Duyệt đánh giá bác sĩ', 'DANH_GIA_BAC_SI', 'Cập nhật trạng thái hiển thị đánh giá', CURRENT_TIMESTAMP),
  ('DANH_GIA_BAC_SI.DELETE', 'Xóa đánh giá bác sĩ', 'DANH_GIA_BAC_SI', 'Xóa đánh giá bác sĩ', CURRENT_TIMESTAMP),
  ('CHATBOX_AI.VIEW', 'Xem Chatbox AI', 'CHATBOX_AI', 'Xem phiên chat và thống kê AI', CURRENT_TIMESTAMP),
  ('CHATBOX_AI.CREATE', 'Tạo hội thoại AI', 'CHATBOX_AI', 'Khởi tạo phiên hội thoại AI', CURRENT_TIMESTAMP),
  ('CHATBOX_AI.UPDATE', 'Cập nhật Chatbox AI', 'CHATBOX_AI', 'Cập nhật cấu hình hoặc trạng thái hội thoại', CURRENT_TIMESTAMP),
  ('CHATBOX_AI.DELETE', 'Xóa hội thoại AI', 'CHATBOX_AI', 'Xóa phiên hội thoại AI', CURRENT_TIMESTAMP),
  ('NHAT_KY_HE_THONG.VIEW', 'Xem nhật ký hệ thống', 'NHAT_KY_HE_THONG', 'Xem lịch sử thao tác hệ thống', CURRENT_TIMESTAMP),
  ('NHAT_KY_HE_THONG.CREATE', 'Tạo nhật ký hệ thống', 'NHAT_KY_HE_THONG', 'Ghi nhận nhật ký hệ thống', CURRENT_TIMESTAMP),
  ('NHAT_KY_HE_THONG.UPDATE', 'Cập nhật nhật ký hệ thống', 'NHAT_KY_HE_THONG', 'Cập nhật nhật ký hệ thống', CURRENT_TIMESTAMP),
  ('NHAT_KY_HE_THONG.DELETE', 'Xóa nhật ký hệ thống', 'NHAT_KY_HE_THONG', 'Xóa nhật ký hệ thống', CURRENT_TIMESTAMP),
  ('VAI_TRO.VIEW', 'Xem vai trò và phân quyền', 'VAI_TRO', 'Xem danh sách vai trò và quyền', CURRENT_TIMESTAMP),
  ('VAI_TRO.CREATE', 'Thêm vai trò', 'VAI_TRO', 'Tạo vai trò mới', CURRENT_TIMESTAMP),
  ('VAI_TRO.UPDATE', 'Cập nhật phân quyền', 'VAI_TRO', 'Cập nhật vai trò và quyền thao tác', CURRENT_TIMESTAMP),
  ('VAI_TRO.DELETE', 'Xóa vai trò', 'VAI_TRO', 'Xóa vai trò không còn sử dụng', CURRENT_TIMESTAMP),
  ('CAI_DAT_HE_THONG.VIEW', 'Xem cài đặt hệ thống', 'CAI_DAT_HE_THONG', 'Xem cấu hình hệ thống', CURRENT_TIMESTAMP),
  ('CAI_DAT_HE_THONG.CREATE', 'Tạo cài đặt hệ thống', 'CAI_DAT_HE_THONG', 'Tạo cấu hình hệ thống', CURRENT_TIMESTAMP),
  ('CAI_DAT_HE_THONG.UPDATE', 'Cập nhật cài đặt hệ thống', 'CAI_DAT_HE_THONG', 'Cập nhật cấu hình hệ thống', CURRENT_TIMESTAMP),
  ('CAI_DAT_HE_THONG.DELETE', 'Xóa cài đặt hệ thống', 'CAI_DAT_HE_THONG', 'Xóa cấu hình hệ thống', CURRENT_TIMESTAMP)
ON CONFLICT ("ma_quyen") DO UPDATE
SET
  "ten_quyen" = EXCLUDED."ten_quyen",
  "phan_he" = EXCLUDED."phan_he",
  "mo_ta" = EXCLUDED."mo_ta",
  "updated_at" = CURRENT_TIMESTAMP;

-- Quản trị viên có toàn bộ các quyền mới; các vai trò khác sẽ được cấp có chủ đích trên màn hình phân quyền.
INSERT INTO "vai_tro_quyen" ("vai_tro_id", "quyen_id", "updated_at")
SELECT vai_tro.id, quyen.id, CURRENT_TIMESTAMP
FROM "vai_tro" AS vai_tro
CROSS JOIN "quyen" AS quyen
WHERE vai_tro."ma_vai_tro" = 'ADMIN'
  AND quyen."phan_he" IN (
    'BAC_SI', 'BENH_NHAN', 'CHUYEN_KHOA', 'DICH_VU', 'TIEP_DON', 'CAP_THUOC',
    'LICH_LAM_VIEC', 'BAN_GIAO_CA', 'BAO_CAO', 'DANH_GIA_BAC_SI', 'CHATBOX_AI',
    'NHAT_KY_HE_THONG', 'VAI_TRO', 'CAI_DAT_HE_THONG'
  )
ON CONFLICT ("vai_tro_id", "quyen_id") DO NOTHING;
