import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('Quyền thao tác thuốc', () => {
  function check(roles: string[], permissions: string[], required: string) {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValueOnce([required]).mockReturnValueOnce(undefined) };
    const context = {
      getHandler: () => ({}), getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { roles, permissions } }) }),
    } as unknown as ExecutionContext;
    return () => new PermissionsGuard(reflector as unknown as Reflector).canActivate(context);
  }

  it.each(['THUOC.CREATE', 'THUOC.UPDATE', 'THUOC.DELETE'])(
    'chặn ADMIN với %s ngay cả khi quyền cũ còn trong database', (permission) => {
      expect(check(['ADMIN'], [permission], permission)).toThrow(ForbiddenException);
    },
  );
  it('cho ADMIN xem thuốc khi có quyền', () => {
    expect(check(['ADMIN'], ['THUOC.VIEW'], 'THUOC.VIEW')()).toBe(true);
  });
  it('cho dược sĩ qua bước kiểm tra quyền và vẫn yêu cầu kiểm tra trưởng khoa ở service xóa', () => {
    expect(check(['PHARMACIST'], ['THUOC.DELETE'], 'THUOC.DELETE')()).toBe(true);
  });
});
