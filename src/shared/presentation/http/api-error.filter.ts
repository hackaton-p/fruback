import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { databaseErrorMessage } from './database-error-message';
import { DomainError } from '../../domain/domain-error';
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    let status = 500;
    let message: unknown =
      'No se pudo completar la operación. Intenta de nuevo; si persiste, informa al administrador.';
    let code: string | undefined;
    if (error instanceof DomainError) {
      status = error.status;
      message = error.message;
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      const response = error.getResponse();
      message =
        typeof response === 'string'
          ? response
          : 'message' in response
            ? response.message
            : 'Revisa los campos enviados.';
      if (
        typeof response === 'object' &&
        'code' in response &&
        typeof response.code === 'string'
      )
        code = response.code;
    } else if (typeof error === 'object' && error && 'code' in error) {
      if (['23505', '23503', '40001', '40P01'].includes(String(error.code))) {
        status = 409;
        message =
          'Los datos cambiaron o ya existe un registro relacionado. Actualiza la página y vuelve a intentar.';
        code = 'DATA_CONFLICT';
      } else if (
        ['23514', '23502', '22003', '22007', '22008', '22P02'].includes(
          String(error.code),
        )
      ) {
        status = 400;
        code = 'DATA_VALIDATION_ERROR';
        message = databaseErrorMessage(
          String(error.code),
          'constraint' in error && typeof error.constraint === 'string'
            ? error.constraint
            : undefined,
          'column' in error && typeof error.column === 'string'
            ? error.column
            : undefined,
        );
        this.logger.warn(`Database validation rejected: ${String(error.code)}`);
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
      .json({ statusCode: status, message, ...(code ? { code } : {}) });
  }
}
