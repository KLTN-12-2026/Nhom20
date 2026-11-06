import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const ROLE_PERMISSIONS_KEY = 'permissionsByRole';

// Khai báo quyền thao tác bắt buộc cho từng API nghiệp vụ.
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// API dùng chung kiểm tra quyền phù hợp với từng vai trò được phép truy cập.
export const PermissionsByRole = (permissions: Record<string, string>) =>
  SetMetadata(ROLE_PERMISSIONS_KEY, permissions);
