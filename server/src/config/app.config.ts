import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME,
  port: Number(process.env.APP_PORT) || 8000,
  prefix: process.env.API_PREFIX || 'api',
}));
