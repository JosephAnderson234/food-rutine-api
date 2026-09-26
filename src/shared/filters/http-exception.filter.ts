import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

/** Forma única de error: { statusCode, message, error, timestamp, path }. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      [status, message] = resolvePrismaError(exception);
    } else {
      this.logger.error(exception);
    }

    res.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status] ?? 'Error',
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}

export function resolvePrismaError(
  e: Prisma.PrismaClientKnownRequestError,
): [number, string] {
  switch (e.code) {
    case 'P2002':
      return [HttpStatus.CONFLICT, 'Ya existe un registro con esos datos'];
    case 'P2025':
      return [HttpStatus.NOT_FOUND, 'No encontrado'];
    default:
      return [HttpStatus.INTERNAL_SERVER_ERROR, 'Error de base de datos'];
  }
}
