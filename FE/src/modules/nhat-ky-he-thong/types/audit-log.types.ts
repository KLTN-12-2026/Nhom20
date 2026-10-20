export type SystemModule =
  | 'XAC_THUC'
  | 'NGUOI_DUNG'
  | 'BAC_SI'
  | 'CHUYEN_KHOA'
  | 'BENH_NHAN'
  | 'LICH_HEN'
  | 'THUOC'
  | 'HE_THONG';

export interface SystemLogItem {
  id: number;
  userId: number | null;
  userName: string;
  email: string | null;
  role: string;
  module: SystemModule;
  action: string;
  detail: string | null;
  occurredAt: string;
  avatar: string | null;
}

export interface AuditLogQuery {
  search?: string;
  module?: SystemModule;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
