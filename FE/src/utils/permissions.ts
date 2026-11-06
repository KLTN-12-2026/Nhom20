import type { AuthenticatedUser } from '@/modules/xac-thuc/types/auth.types';

export function hasPermission(
  user: AuthenticatedUser | null | undefined,
  permission: string | undefined,
) {
  // Giữ lối vào màn hình phân quyền cho ADMIN khi các quyền khác bị tắt.
  return (
    !permission ||
    Boolean(
      (user?.roles.includes('ADMIN') &&
        ['VAI_TRO.VIEW', 'VAI_TRO.UPDATE'].includes(permission)) ||
        user?.permissions?.includes(permission),
    )
  );
}
