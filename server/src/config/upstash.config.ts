import { registerAs } from '@nestjs/config';

export default registerAs('upstash', () => ({
  restUrl: process.env.UPSTASH_REDIS_REST_URL,
  restToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  baseUrl: process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, ''),
}));
