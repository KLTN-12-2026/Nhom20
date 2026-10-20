import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface ServiceResponse<T> {
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T | ServiceResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T | ServiceResponse<T>>,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((response) => {
        if (response && typeof response === 'object' && 'data' in response) {
          const serviceResponse = response;

          return {
            success: true,
            message: serviceResponse.message ?? 'Thành công',
            data: serviceResponse.data,
            ...(serviceResponse.meta ? { meta: serviceResponse.meta } : {}),
          };
        }

        return {
          success: true,
          message: 'Thành công',
          data: response,
        };
      }),
    );
  }
}
