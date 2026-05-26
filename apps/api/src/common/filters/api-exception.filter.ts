import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import type { Response } from 'express';

type ErrorBody = {
  code?: string;
  message?: string | string[];
  userMessage?: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const normalized = this.normalizeErrorBody(body, status);

    response.status(status).json({
      error: normalized
    });
  }

  private normalizeErrorBody(body: string | object | null, status: number) {
    if (typeof body === 'string') {
      return {
        code: this.defaultCode(status),
        message: body,
        userMessage: this.defaultUserMessage(status)
      };
    }

    const errorBody = (body ?? {}) as ErrorBody;
    const message = Array.isArray(errorBody.message) ? errorBody.message.join(', ') : errorBody.message;

    return {
      code: errorBody.code ?? this.defaultCode(status),
      message: message ?? 'Unexpected server error',
      userMessage: errorBody.userMessage ?? this.defaultUserMessage(status)
    };
  }

  private defaultCode(status: number) {
    if (status === HttpStatus.BAD_REQUEST) {
      return 'BAD_REQUEST';
    }

    if (status === HttpStatus.NOT_FOUND) {
      return 'NOT_FOUND';
    }

    return 'INTERNAL_SERVER_ERROR';
  }

  private defaultUserMessage(status: number) {
    if (status === HttpStatus.BAD_REQUEST) {
      return '요청 값을 다시 확인해 주세요.';
    }

    if (status === HttpStatus.NOT_FOUND) {
      return '요청한 정보를 찾을 수 없습니다.';
    }

    return '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }
}

