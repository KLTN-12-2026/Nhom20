// Cấu hình menu thanh điều hướng bên cho các trang quản trị.

export interface MenuItem {
  label: string;
  icon: string;
  href: string;
  permission?: string;
  pushToBottom?: boolean;
  departmentHeadOnly?: boolean;
}

/**
 * Admin menu items. These can be filtered by user role in the future.
 */
export const ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Tổng quan',
    icon: 'dashboard',
    href: '/admin/dashboard',
    permission: 'BAO_CAO.VIEW',
  },
  {
    label: 'Quản lý nhân sự',
    icon: 'group',
    href: '/admin/nguoi-dung',
    permission: 'NGUOI_DUNG.VIEW',
  },
  {
    label: 'Quản lý bác sĩ',
    icon: 'medical_services',
    href: '/admin/bac-si',
    permission: 'BAC_SI.VIEW',
  },
  {
    label: 'Quản lý bệnh nhân',
    icon: 'person',
    href: '/admin/benh-nhan',
    permission: 'BENH_NHAN.VIEW',
  },
  {
    label: 'Quản lý chuyên khoa',
    icon: 'category',
    href: '/admin/chuyen-khoa',
    permission: 'CHUYEN_KHOA.VIEW',
  },
  {
    label: 'Quản lý lịch hẹn',
    icon: 'event',
    href: '/admin/lich-hen',
    permission: 'LICH_HEN.VIEW',
  },
  {
    label: 'Quản lý dịch vụ',
    icon: 'medical_information',
    href: '/admin/dich-vu',
    permission: 'DICH_VU.VIEW',
  },
  {
    label: 'Quản lý kho thuốc',
    icon: 'medication',
    href: '/admin/thuoc',
    permission: 'THUOC.VIEW',
  },
  {
    label: 'Báo cáo và thống kê',
    icon: 'analytics',
    href: '/admin/bao-cao',
    permission: 'BAO_CAO.VIEW',
  },
  {
    label: 'Quản lý đánh giá bác sĩ',
    icon: 'star_rate',
    href: '/admin/danh-gia-bac-si',
    permission: 'DANH_GIA_BAC_SI.VIEW',
  },
  {
    label: 'Quản lý Chatbox AI',
    icon: 'smart_toy',
    href: '/admin/chatbox-ai',
    permission: 'CHATBOX_AI.VIEW',
  },
  {
    label: 'Quản lý bàn giao ca',
    icon: 'assignment_turned_in',
    href: '/admin/ban-giao-ca',
    permission: 'BAN_GIAO_CA.VIEW',
  },
  {
    label: 'Nhật ký hệ thống',
    icon: 'history',
    href: '/admin/nhat-ky',
    permission: 'NHAT_KY_HE_THONG.VIEW',
  },
  {
    label: 'Vai trò và phân quyền',
    icon: 'security',
    href: '/admin/vai-tro',
    permission: 'VAI_TRO.VIEW',
  },
  {
    label: 'Cài đặt hệ thống',
    icon: 'settings',
    href: '/admin/cai-dat',
    pushToBottom: true,
  },
];

export const DOCTOR_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Tổng quan',
    icon: 'dashboard',
    href: '/bac-si',
  },
  {
    label: 'Lịch khám',
    icon: 'calendar_today',
    href: '/bac-si/lich-kham',
    permission: 'LICH_HEN.VIEW',
  },
  {
    label: 'Bệnh nhân chờ',
    icon: 'groups',
    href: '/bac-si/hang-doi',
  },
  {
    label: 'Lịch sử khám',
    icon: 'history',
    href: '/bac-si/lich-su-kham',
  },
  {
    label: 'Lịch làm việc',
    icon: 'calendar_month',
    href: '/bac-si/lich-lam-viec',
    permission: 'LICH_LAM_VIEC.VIEW',
  },
  {
    label: 'Phân lịch trực đêm',
    icon: 'event_available',
    href: '/bac-si/duyet-lich-lam-viec',
    permission: 'LICH_LAM_VIEC.UPDATE',
    departmentHeadOnly: true,
  },
  {
    label: 'Hồ sơ bệnh nhân',
    icon: 'folder_shared',
    href: '/bac-si/ho-so-benh-nhan',
    permission: 'BENH_AN.VIEW',
    departmentHeadOnly: true,
  },
  {
    label: 'Thông tin cá nhân',
    icon: 'person',
    href: '/bac-si/thong-tin-ca-nhan',
    pushToBottom: true,
  },
];

export const PHARMACIST_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Tổng quan',
    icon: 'dashboard',
    href: '/duoc-si',
  },
  {
    label: 'Đơn thuốc chờ cấp',
    icon: 'pending_actions',
    href: '/duoc-si/don-cho-cap',
    permission: 'CAP_THUOC.VIEW',
  },
  {
    label: 'Đơn thuốc đang xử lý',
    icon: 'hourglass_top',
    href: '/duoc-si/dang-xu-ly',
    permission: 'CAP_THUOC.VIEW',
  },
  {
    label: 'Quản lý kho thuốc',
    icon: 'medication',
    href: '/duoc-si/thuoc',
    permission: 'THUOC.VIEW',
  },
  {
    label: 'Lịch sử cấp thuốc',
    icon: 'history',
    href: '/duoc-si/lich-su-cap-thuoc',
    permission: 'CAP_THUOC.VIEW',
  },
  { label: 'Lịch làm việc', icon: 'calendar_month', href: '/duoc-si/lich-lam-viec', permission: 'LICH_LAM_VIEC.VIEW' },
  { label: 'Phân lịch trực đêm', icon: 'event_available', href: '/duoc-si/duyet-lich-lam-viec', permission: 'LICH_LAM_VIEC.UPDATE', departmentHeadOnly: true },
  {
    label: 'Thông tin cá nhân',
    icon: 'person',
    href: '/duoc-si/thong-tin-ca-nhan',
    pushToBottom: true,
  },
];

export const CASHIER_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Tổng quan',
    icon: 'dashboard',
    href: '/thu-ngan',
  },
  {
    label: 'Tiếp đón bệnh nhân',
    icon: 'person_add',
    href: '/thu-ngan/tiep-don',
    permission: 'TIEP_DON.VIEW',
  },
  {
    label: 'Quản lý lịch hẹn',
    icon: 'event',
    href: '/thu-ngan/lich-hen',
    permission: 'LICH_HEN.VIEW',
  },
  {
    label: 'Quản lý bệnh nhân',
    icon: 'group',
    href: '/thu-ngan/benh-nhan',
    permission: 'BENH_NHAN.VIEW',
  },
  {
    label: 'Quản lý thanh toán',
    icon: 'payments',
    href: '/thu-ngan/thanh-toan',
    permission: 'HOA_DON.VIEW',
  },
  {
    label: 'Báo cáo ca trực',
    icon: 'description',
    href: '/thu-ngan/ca-truc',
    permission: 'BAN_GIAO_CA.VIEW',
  },
  {
    label: 'Nhận bàn giao ca',
    icon: 'assignment_turned_in',
    href: '/thu-ngan/nhan-ban-giao',
    permission: 'BAN_GIAO_CA.VIEW',
  },
  {
    label: 'Lịch làm việc',
    icon: 'calendar_month',
    href: '/thu-ngan/lich-lam-viec',
    permission: 'LICH_LAM_VIEC.VIEW',
  },
  {
    label: 'Phân lịch trực đêm',
    icon: 'event_available',
    href: '/thu-ngan/duyet-lich-lam-viec',
    permission: 'LICH_LAM_VIEC.UPDATE',
    departmentHeadOnly: true,
  },
  {
    label: 'Thông tin cá nhân',
    icon: 'manage_accounts',
    href: '/thu-ngan/thong-tin-ca-nhan',
    pushToBottom: true,
  },
];
