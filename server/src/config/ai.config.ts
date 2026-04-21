// src/config/ai.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  provider: process.env.AI_PROVIDER || 'deepseek',
  enabled: process.env.DEEPSEEK_ENABLED === 'true',
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7'),
    requestTimeout: parseInt(
      process.env.DEEPSEEK_REQUEST_TIMEOUT || '30000',
      10,
    ),
    monthlyBudget: parseFloat(process.env.DEEPSEEK_MONTHLY_BUDGET || '2'),
    // Rate limiting configuration (requests per minute)
    rateLimitMinTime: parseInt(
      process.env.DEEPSEEK_RATE_LIMIT_MIN_TIME || '600',
      10,
    ), // milliseconds between requests (default 600ms = 100 req/min)
    rateLimitMaxConcurrent: parseInt(
      process.env.DEEPSEEK_RATE_LIMIT_MAX_CONCURRENT || '5',
      10,
    ), // max concurrent requests
  },
}));
