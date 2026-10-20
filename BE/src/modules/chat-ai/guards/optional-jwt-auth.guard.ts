import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard này cho phép khách vãng lai và người đã đăng nhập dùng chung endpoint Chatbox.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Cho phép khách vãng lai đi qua, nhưng vẫn gắn tài khoản khi JWT hợp lệ.
  handleRequest<TUser = unknown>(_error: unknown, user: TUser | null): TUser {
    return (user ?? null) as TUser;
  }
}
