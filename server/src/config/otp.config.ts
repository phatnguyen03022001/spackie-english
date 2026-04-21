// src/config/otp.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('otp', () => ({
  ttl: parseInt(process.env.OTP_TTL || '300', 10), // seconds
  length: parseInt(process.env.OTP_LENGTH || '6', 10), // number of digits
}));
