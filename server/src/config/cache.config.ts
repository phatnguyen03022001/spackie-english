// src/config/cache.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10),
  idempotencyTtl: parseInt(process.env.IDEMPOTENCY_TTL || '86400', 10),
  idempotencyEnabled: process.env.IDEMPOTENCY_ENABLE === 'true',
}));
