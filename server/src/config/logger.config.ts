import { registerAs } from '@nestjs/config';

export default registerAs('logger', () => ({
  level: process.env.PINO_LOG_LEVEL || 'info',
  logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
  logRequestBody: process.env.LOG_REQUEST_BODY === 'true', // tuỳ chọn
  redactPaths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.confirmPassword',
    'req.body.newPassword',
  ],
}));
