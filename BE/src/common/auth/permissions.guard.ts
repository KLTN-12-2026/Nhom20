import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedUser } from './authenticated-user.type';
import { PERMISSIONS_KEY, ROLE_PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(protected readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const permissionsByRole = this.reflector.getAllAndOverride<Record<string, string>>(
      ROLE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions?.length && !permissionsByRole) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    // Quản trị viên chỉ được xem thuốc, kể cả khi cấu hình cũ còn quyền sửa.
    if (user?.roles.includes('ADMIN') && requiredPermissions?.some((permission) =>
      ['THUOC.CREATE', 'THUOC.UPDATE', 'THUOC.DELETE'].includes(permission),
    )) {
      throw new ForbiddenException('Thao tác quản lý thuốc thuộc thẩm quyền của dược sĩ');
    }
    if (permissionsByRole) {
      const hasRolePermission = user?.roles.some((role) => {
        const permission = permissionsByRole[role];
        return permission && user.permissions?.includes(permission);
      });
      if (!hasRolePermission) {
        throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
      }
    }
    if (!requiredPermissions?.length) return true;
    // Giữ quyền vào và lưu phân quyền cho ADMIN để không tự khóa hệ thống.
    // Các quyền nghiệp vụ khác vẫn được kiểm tra theo cấu hình đã lưu.
    if (
      user?.roles.includes('ADMIN') &&
      requiredPermissions.every((permission) =>
        ['VAI_TRO.VIEW', 'VAI_TRO.UPDATE'].includes(permission),
      )
    )
      return true;
    const hasPermission = requiredPermissions.every((permission) =>
      user?.permissions?.includes(permission),
    );
    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
    return true;
  }
}
