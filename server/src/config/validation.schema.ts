// src/config/validation.schema.ts
import Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_NAME: Joi.string().default('NestJS Server'),
  APP_PORT: Joi.number().port().default(8000),
  API_PREFIX: Joi.string().default('api'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  FRONTEND_URL_STAGING: Joi.string().uri().optional(),

  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_POOL_SIZE: Joi.number().integer().min(1).max(50).default(10),
  DATABASE_POOL_MIN: Joi.number().integer().min(0).default(2),

  // Auth
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_PREVIOUS_SECRET: Joi.string().optional(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(4).max(31).default(10),

  // Swagger
  SWAGGER_ENABLE: Joi.boolean().default(false),
  SWAGGER_PATH: Joi.string().default('docs'),
  SWAGGER_TITLE: Joi.string().optional(),
  SWAGGER_DESCRIPTION: Joi.string().optional(),
  SWAGGER_VERSION: Joi.string().default('1.0'),

  // CORS
  CORS_ALLOWED_ORIGINS: Joi.string().optional().default(''),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
  LOG_REQUEST_BODY: Joi.boolean().default(false),
  LOG_RESPONSE_BODY: Joi.boolean().default(false),

  // OpenTelemetry
  OTEL_SERVICE_NAME: Joi.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: Joi.string().optional(),
  OTEL_METRICS_EXPORTER: Joi.string().optional(),

  // Email
  BREVO_API_KEY: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().optional(),
  EMAIL_FROM_NAME: Joi.string().optional(),

  // Cloudinary
  STORAGE_PROVIDER: Joi.string()
    .valid('cloudinary', 'r2', 's3')
    .default('cloudinary'),
  CLOUDINARY_CLOUD_NAME: Joi.string().when('STORAGE_PROVIDER', {
    is: 'cloudinary',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  CLOUDINARY_API_KEY: Joi.string().when('STORAGE_PROVIDER', {
    is: 'cloudinary',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  CLOUDINARY_API_SECRET: Joi.string().when('STORAGE_PROVIDER', {
    is: 'cloudinary',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  // Redis
  REDIS_URL: Joi.string().required(),
  REDIS_MAX_RETRIES: Joi.number().integer().min(1).max(20).default(3),
  REDIS_CONNECT_TIMEOUT: Joi.number().integer().default(10000),
  REDIS_COMMAND_TIMEOUT: Joi.number().integer().default(5000),
  UPSTASH_REDIS_REST_URL: Joi.string().uri().optional(),
  UPSTASH_REDIS_REST_TOKEN: Joi.string().optional(),

  // Cache & Idempotency
  CACHE_DEFAULT_TTL: Joi.number().integer().default(300),
  IDEMPOTENCY_TTL: Joi.number().integer().default(86400),

  // Throttler
  THROTTLE_TTL: Joi.number().integer().default(60),
  THROTTLE_LIMIT: Joi.number().integer().default(100),
  THROTTLE_SHORT_TTL: Joi.number().integer().default(1000),
  THROTTLE_SHORT_LIMIT: Joi.number().integer().default(10),
  THROTTLE_MEDIUM_TTL: Joi.number().integer().default(60000),
  THROTTLE_MEDIUM_LIMIT: Joi.number().integer().default(100),
  THROTTLE_LONG_TTL: Joi.number().integer().default(3600000),
  THROTTLE_LONG_LIMIT: Joi.number().integer().default(1000),

  // Pusher
  PUSHER_APP_ID: Joi.string().optional(),
  PUSHER_KEY: Joi.string().optional(),
  PUSHER_SECRET: Joi.string().optional(),
  PUSHER_CLUSTER: Joi.string().default('ap1'),

  // Sentry (optional)
  SENTRY_DSN: Joi.string().uri().optional(),
  SENTRY_ENVIRONMENT: Joi.string().optional(),

  // Idempotency toggle
  IDEMPOTENCY_ENABLE: Joi.boolean().default(true),

  // Logging in production
  LOG_BODY_IN_PROD: Joi.boolean().default(false),

  // Vercel CORS
  VERCEL_TEAM_SLUG: Joi.string().optional(),

  // Pagination
  DEFAULT_PAGE_SIZE: Joi.number().integer().min(1).max(100).default(20),

  // API versioning
  API_VERSION: Joi.string().default('v1'),

  // PayOS
  PAYOS_CLIENT_ID: Joi.string().required(),
  PAYOS_API_KEY: Joi.string().required(),
  PAYOS_CHECKSUM_KEY: Joi.string().required(),
  PAYOS_API_URL: Joi.string().uri().default('https://api-merchant.payos.vn'),
  PAYOS_MODE: Joi.string().valid('sandbox', 'production').default('sandbox'),

  // Queue
  BULL_PREFIX: Joi.string().default('bull'),
  BULL_COMPLETED_TTL: Joi.number().integer().default(86400),
  BULL_FAILED_TTL: Joi.number().integer().default(604800),

  // Map
  MAP_PROVIDER: Joi.string().valid('maptiler', 'google').default('maptiler'),
  MAP_API_KEY: Joi.string().required(),
  MAP_TILES_BASE_URL: Joi.string().optional(),

  // AI
  AI_PROVIDER: Joi.string().valid('deepseek', 'openai').default('deepseek'),
  DEEPSEEK_ENABLED: Joi.boolean().default(true),
  DEEPSEEK_API_KEY: Joi.when('AI_PROVIDER', {
    is: 'deepseek',
    then: Joi.required(),
  }),
  DEEPSEEK_API_URL: Joi.string().uri().default('https://api.deepseek.com/v1'),
  DEEPSEEK_MODEL: Joi.string().default('deepseek-chat'),
  DEEPSEEK_MAX_TOKENS: Joi.number().integer().default(2000),
  DEEPSEEK_TEMPERATURE: Joi.number().min(0).max(2).default(0.7),
  DEEPSEEK_REQUEST_TIMEOUT: Joi.number().integer().default(30000),
  DEEPSEEK_MONTHLY_BUDGET: Joi.number().default(2),
  DEEPSEEK_RATE_LIMIT_MIN_TIME: Joi.number().integer().default(600),
  DEEPSEEK_RATE_LIMIT_MAX_CONCURRENT: Joi.number().integer().default(5),

  // OTP
  OTP_TTL: Joi.number().integer().default(300),
  OTP_LENGTH: Joi.number().integer().min(4).max(8).default(6),

  // Pixabay
  PIXABAY_API_KEY: Joi.string().optional(),

  // TTS (Google Text-to-Speech)
  TTS_ENABLED: Joi.boolean().default(false),
  TTS_PROVIDER: Joi.string()
    .valid('google', 'amazon', 'azure')
    .default('google'),
  GOOGLE_TTS_API_KEY: Joi.string().optional().allow(''),
  GOOGLE_TTS_LANGUAGE: Joi.string().default('en-US'),
  GOOGLE_TTS_VOICE: Joi.string().default('en-US-Standard-B'),
  GOOGLE_TTS_SPEED: Joi.number().min(0.25).max(4.0).default(1.0),
  GOOGLE_TTS_TIMEOUT: Joi.number().integer().default(15000),
});
