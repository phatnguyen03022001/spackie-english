// src/config/pixabay.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('pixabay', () => ({
  apiKey: process.env.PIXABAY_API_KEY,
  apiUrl: process.env.PIXABAY_API_URL || 'https://pixabay.com/api/',
  timeout: parseInt(process.env.PIXABAY_TIMEOUT || '10000', 10),
  perPage: parseInt(process.env.PIXABAY_PER_PAGE || '3', 10),
}));
