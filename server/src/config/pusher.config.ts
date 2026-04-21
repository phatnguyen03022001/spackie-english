// src/config/pusher.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('pusher', () => ({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'ap1',
  useTLS: true, // khuyến nghị bật TLS
}));
