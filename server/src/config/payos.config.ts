// src/config/payos.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('payos', () => ({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  apiUrl: process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn',
  mode: process.env.PAYOS_MODE || 'sandbox',
}));
