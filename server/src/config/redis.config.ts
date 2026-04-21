import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL, // bắt buộc nếu dùng cache/idempotency
  // Upstash REST (không dùng trong common, nhưng có thể giữ)
  restUrl: process.env.UPSTASH_REDIS_REST_URL,
  restToken: process.env.UPSTASH_REDIS_REST_TOKEN,
}));
