// src/config/logger.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('logger', () => ({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  logRequestBody: process.env.LOG_REQUEST_BODY === 'true',
  logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
  logBodyInProd: process.env.LOG_BODY_IN_PROD === 'true', // thêm dòng này
  redactPaths: ['password', 'token', 'refreshToken', 'authorization', 'cookie'],
}));
