// src/config/throttler.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('throttler', () => [
  {
    name: 'short',
    ttl: parseInt(process.env.THROTTLE_SHORT_TTL || '1000', 10),
    limit: parseInt(process.env.THROTTLE_SHORT_LIMIT || '10', 10),
  },
  {
    name: 'medium',
    ttl: parseInt(process.env.THROTTLE_MEDIUM_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_MEDIUM_LIMIT || '100', 10),
  },
  {
    name: 'long',
    ttl: parseInt(process.env.THROTTLE_LONG_TTL || '3600000', 10),
    limit: parseInt(process.env.THROTTLE_LONG_LIMIT || '1000', 10),
  },
  {
    name: 'default',
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
]);
