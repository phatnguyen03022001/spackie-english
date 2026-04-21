// src/config/queue.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  prefix: process.env.BULL_PREFIX || 'bull',
  completedTtl: parseInt(process.env.BULL_COMPLETED_TTL || '86400', 10),
  failedTtl: parseInt(process.env.BULL_FAILED_TTL || '604800', 10),
}));
