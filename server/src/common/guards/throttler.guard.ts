// src/common/guards/throttler.guard.ts
import {
  Injectable,
  ExecutionContext,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { ERROR_CODES } from '@common/constants/error-codes.const';

// Định nghĩa Interface để tránh dùng 'any' (Mục 7)
interface RequestWithUser extends Request {
  user?: {
    id: string | number;
  };
}

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  // Mục 17: Ưu tiên x-forwarded-for khi chạy sau Proxy (Render)
  protected override getTracker(req: RequestWithUser): Promise<string> {
    const userId = req.user?.id;
    if (userId) return Promise.resolve(`user:${userId}`);

    const forwarded = req.headers['x-forwarded-for'];
    let ip = '';

    if (Array.isArray(forwarded)) {
      ip = forwarded[0];
    } else if (typeof forwarded === 'string') {
      ip = forwarded.split(',')[0].trim();
    } else {
      ip = req.ip || 'unknown';
    }

    // Trả về Promise.resolve để khớp với signature mà không cần async/await (Fix ESLint require-await)
    return Promise.resolve(`ip:${ip}`);
  }

  // Mục 6: Custom lỗi trả về theo format chuẩn của Version 2.0
  protected override throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();

    const errorResponse = {
      success: false,
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED, // Đúng format DOMAIN_ACTION_REASON
        message: 'Too many requests. Please try again later.',
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // Ném HttpException để HttpExceptionFilter có thể parse đúng format
    throw new HttpException(errorResponse, HttpStatus.TOO_MANY_REQUESTS);
  }
}
