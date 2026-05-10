import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { requestContext } from '@common/context/request-context';
import { Request } from 'express';

interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    let requestId = request.headers['x-request-id'] as string;
    if (!requestId) requestId = randomUUID();
    request.requestId = requestId;
    return requestContext.run({ requestId }, () => next.handle());
  }
}
