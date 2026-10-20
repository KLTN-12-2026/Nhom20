import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import type { AuthenticatedUser } from './authenticated-user.type';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
