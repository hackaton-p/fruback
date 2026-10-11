import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../../domain/domain-error';
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    let status = 500;
    let message: unknown = 'Internal server error';
    if (error instanceof DomainError) {
      status = error.status;
      message = error.message;
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      message = error.getResponse();
    } else if (typeof error === 'object' && error && 'code' in error) {
      if (['23505', '23503', '40001', '40P01'].includes(String(error.code))) {
        status = 409;
        message = 'Conflicting data or concurrent change';
      } else if (
        ['23514', '23502', '22003', '22007'].includes(String(error.code))
      ) {
        status = 400;
        message = 'Invalid data';
      }
    }
    if (status === 500)
      this.logger.error(
        error instanceof Error ? error.message : 'Unknown error',
      );
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
