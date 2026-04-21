// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
}));
