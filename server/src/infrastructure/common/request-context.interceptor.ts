import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { requestContext } from './request-context';
import { Request } from 'express';

// Extend Request type để có requestId
interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    let requestId = request.headers['x-request-id'] as string;
    if (!requestId) requestId = randomUUID();
    // Gắn vào request để logging interceptor (trong common) có thể dùng
    request.requestId = requestId;
    // Chạy handler trong context với requestId
    return requestContext.run({ requestId }, () => next.handle());
  }
}
