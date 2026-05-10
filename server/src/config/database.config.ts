// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  // Tăng pool size lên 50-100 khi production để hỗ trợ xử lý job song song
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '50', 10),
  poolMin: parseInt(process.env.DATABASE_POOL_MIN || '10', 10),
}));
