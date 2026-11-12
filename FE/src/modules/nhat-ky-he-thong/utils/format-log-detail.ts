import type { SystemLogItem } from '../types/audit-log.types';

const STATUS_LABELS: Record<string, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  DA_TU_CHOI: 'Đã từ chối',
  DA_HUY: 'Đã hủy',
  DA_CHECK_IN: 'Đã check-in',
  KHONG_DEN: 'Không đến khám',
  DANG_HOAT_DONG: 'Đang hoạt động',
  NGUNG_HOAT_DONG: 'Ngừng hoạt động',
  BI_KHOA: 'Bị khóa',
};

// Diễn đạt lại phần mô tả khi hiển thị, giữ nguyên dữ liệu nhật ký đã ghi.
export function formatLogDetail(log: SystemLogItem): string | null {
  if (!log.detail) return null;

  if (log.module === 'HE_THONG' && log.action === 'Cập nhật phân quyền') {
    const match = log.detail.match(/^Lưu (\d+) quyền cho vai trò (.+)$/);
    if (match) return `Đã lưu cấu hình gồm ${match[1]} quyền cho vai trò ${match[2]}.`;
  }

  if (log.module === 'XAC_THUC' && log.detail === 'Tạo phiên đăng nhập mới') {
    return 'Đăng nhập thành công và bắt đầu phiên làm việc mới.';
  }

  if (log.module === 'LICH_HEN' && log.action === 'Cập nhật lịch hẹn') {
    const match = log.detail.match(/^Cập nhật lịch hẹn (.+) - ([A-Z_]+)$/);
    if (match && STATUS_LABELS[match[2]]) {
      return `Lịch hẹn ${match[1]} được chuyển sang trạng thái: ${STATUS_LABELS[match[2]]}.`;
    }
  }

  return log.detail;
}
