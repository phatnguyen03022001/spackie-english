import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  enabled: process.env.SWAGGER_ENABLE === 'true',
  path: process.env.SWAGGER_PATH ?? 'api-docs',
  title: process.env.SWAGGER_TITLE ?? 'API Documentation',
  description: process.env.SWAGGER_DESCRIPTION ?? 'API Description',
  version: process.env.SWAGGER_VERSION ?? '1.0',
}));
