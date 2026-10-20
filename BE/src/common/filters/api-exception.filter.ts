import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    if (!(exception instanceof HttpException)) {
      const databaseDetails =
        exception && typeof exception === 'object' && 'code' in exception
          ? ` code=${String(exception.code)} meta=${JSON.stringify(
              'meta' in exception ? exception.meta : undefined,
            )}`
          : '';
      this.logger.error(
        `Unhandled exception${databaseDetails}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    let message = 'Đã xảy ra lỗi hệ thống';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const responseMessage = exceptionResponse.message;
      message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : String(responseMessage);
    }

    response.status(status).json({
      success: false,
      message,
      data: null,
    });
  }
}
