import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

@Injectable()
export class PasswordService {
  hash(password: string) {
    return hash(password, 12);
  }

  verify(password: string, passwordHash: string) {
    return compare(password, passwordHash);
  }
}
