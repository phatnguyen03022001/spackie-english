// src/config/app.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV,
  name: process.env.APP_NAME || 'NestJS Server',
  port: parseInt(process.env.APP_PORT || '8000', 10),
  prefix: process.env.API_PREFIX || 'api',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
  vercelTeamSlug: process.env.VERCEL_TEAM_SLUG,
  swagger: {
    enable: process.env.SWAGGER_ENABLE === 'true',
    path: process.env.SWAGGER_PATH || 'docs',
    title: process.env.SWAGGER_TITLE,
    description: process.env.SWAGGER_DESCRIPTION,
    version: process.env.SWAGGER_VERSION || '1.0',
  },
  cors: {
    allowedOrigins:
      process.env.CORS_ALLOWED_ORIGINS?.split(',').filter(Boolean) || [],
    frontendUrl: process.env.FRONTEND_URL,
    frontendStagingUrl: process.env.FRONTEND_URL_STAGING,
  },
}));
