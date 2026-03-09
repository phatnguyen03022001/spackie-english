// src/common/decorators/current-user.decorator.ts
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestUser } from '../interfaces/request-user.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      return null;
    }

    // Nếu data được truyền vào (ví dụ: @CurrentUser('id')), trả về trường đó
    // Nếu không, trả về toàn bộ object user
    return data ? user[data] : user;
  },
);
