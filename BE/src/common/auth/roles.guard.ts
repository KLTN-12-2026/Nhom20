import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import type { AuthenticatedUser } from './authenticated-user.type';
import { ROLES_KEY } from './roles.decorator';
import { PermissionsGuard } from './permissions.guard';

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard extends PermissionsGuard implements CanActivate {
  constructor(reflector: Reflector) {
    super(reflector);
  }

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return super.canActivate(context);
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const hasRole = user?.roles.some((role) => requiredRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    // Chỉ kiểm tra quyền chi tiết sau JwtAuthGuard đã xác thực và gắn request.user.
    // Guard toàn cục chạy trước JWT sẽ chặn nhầm cả quản trị viên.
    return super.canActivate(context);
  }
}
