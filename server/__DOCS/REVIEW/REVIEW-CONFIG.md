Dưới đây là file **`REVIEW-CONFIG.md`** đã được cập nhật đầy đủ, bao gồm **Pixabay config** và các cập nhật mới nhất.

```markdown
# REVIEW-CONFIG.md – Config Module (Production Standard)

## Mục đích

`config/` là nơi tập trung tất cả cấu hình ứng dụng: validation biến môi trường, định nghĩa typed config object, và cung cấp interface để các module khác truy cập config một cách an toàn, nhất quán.

**Không được phép** đọc `process.env` trực tiếp trong business module – luôn qua `ConfigService`.

## Cấu trúc thư mục hiện tại

```
src/config/
├── app.config.ts           # App core: env, port, prefix, CORS, Swagger, pagination
├── auth.config.ts          # JWT, bcrypt salt rounds
├── database.config.ts      # Database URL, connection pool
├── redis.config.ts         # Redis / Upstash connection
├── storage.config.ts       # Cloudinary / R2 / S3
├── mail.config.ts          # Brevo / email provider
├── logger.config.ts        # Log level, redact paths, body logging
├── cache.config.ts         # Default TTL, idempotency TTL & enable flag
├── throttler.config.ts     # Rate limiting policies (short, medium, long, default)
├── pusher.config.ts        # WebSocket (Pusher) credentials
├── payos.config.ts         # Payment gateway (PayOS)
├── queue.config.ts         # Bull queue configuration (prefix, TTLs)
├── map.config.ts           # Map provider (Maptiler / Google)
├── ai.config.ts            # AI provider (DeepSeek / OpenAI)
├── otp.config.ts           # OTP settings (TTL, length)
├── pixabay.config.ts       # Pixabay API (image search) – **MỚI**
└── validation.schema.ts    # Joi schema cho tất cả env vars
```

## Chi tiết từng file config

### 1. `app.config.ts` – Cấu hình ứng dụng cốt lõi

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV,
  name: process.env.APP_NAME || 'NestJS Server',
  port: parseInt(process.env.APP_PORT || '8000', 10),
  prefix: process.env.API_PREFIX || 'api',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
  vercelTeamSlug: process.env.VERCEL_TEAM_SLUG,
  swagger: {
    enable: process.env.SWAGGER_ENABLE === 'true',
    path: process.env.SWAGGER_PATH || 'docs',
    title: process.env.SWAGGER_TITLE,
    description: process.env.SWAGGER_DESCRIPTION,
    version: process.env.SWAGGER_VERSION || '1.0',
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',').filter(Boolean) || [],
    frontendUrl: process.env.FRONTEND_URL,
    frontendStagingUrl: process.env.FRONTEND_URL_STAGING,
  },
}));
```

**Sử dụng:** `configService.get('app.port')`, `configService.get('app.defaultPageSize')`

### 2. `auth.config.ts` – JWT & Bcrypt

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
}));
```

### 3. `database.config.ts` – Kết nối database

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
}));
```

> **Lưu ý:** Với Prisma, pool size thường được thêm vào connection string: `?maxPoolSize=10&minPoolSize=2`.

### 4. `redis.config.ts` – Redis / Upstash

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL,
  restUrl: process.env.UPSTASH_REDIS_REST_URL,
  restToken: process.env.UPSTASH_REDIS_REST_TOKEN,
}));
```

### 5. `storage.config.ts` – File storage (Cloudinary, R2, S3)

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER || 'cloudinary',
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
}));
```

### 6. `mail.config.ts` – Email (Brevo)

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  provider: 'brevo',
  apiKey: process.env.BREVO_API_KEY,
  from: process.env.EMAIL_FROM,
  fromName: process.env.EMAIL_FROM_NAME,
}));
```

### 7. `logger.config.ts` – Logging

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('logger', () => ({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  logRequestBody: process.env.LOG_REQUEST_BODY === 'true',
  logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
  logBodyInProd: process.env.LOG_BODY_IN_PROD === 'true',
  redactPaths: ['password', 'token', 'refreshToken', 'authorization', 'cookie'],
}));
```

### 8. `cache.config.ts` – Cache TTL & Idempotency

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10),
  idempotencyTtl: parseInt(process.env.IDEMPOTENCY_TTL || '86400', 10),
  idempotencyEnabled: process.env.IDEMPOTENCY_ENABLE === 'true',
}));
```

### 9. `throttler.config.ts` – Rate limiting policies (mảng)

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('throttler', () => [
  { name: 'short', ttl: parseInt(process.env.THROTTLE_SHORT_TTL || '1000', 10), limit: parseInt(process.env.THROTTLE_SHORT_LIMIT || '10', 10) },
  { name: 'medium', ttl: parseInt(process.env.THROTTLE_MEDIUM_TTL || '60000', 10), limit: parseInt(process.env.THROTTLE_MEDIUM_LIMIT || '100', 10) },
  { name: 'long', ttl: parseInt(process.env.THROTTLE_LONG_TTL || '3600000', 10), limit: parseInt(process.env.THROTTLE_LONG_LIMIT || '1000', 10) },
  { name: 'default', ttl: parseInt(process.env.THROTTLE_TTL || '60', 10), limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10) },
]);
```

### 10. `pusher.config.ts` – WebSocket (Pusher)

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('pusher', () => ({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'ap1',
  useTLS: true,
}));
```

### 11. `payos.config.ts` – Payment gateway (PayOS)

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('payos', () => ({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  apiUrl: process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn',
  mode: process.env.PAYOS_MODE || 'sandbox',
}));
```

### 12. `queue.config.ts` – Bull queue

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  prefix: process.env.BULL_PREFIX || 'bull',
  completedTtl: parseInt(process.env.BULL_COMPLETED_TTL || '86400', 10),
  failedTtl: parseInt(process.env.BULL_FAILED_TTL || '604800', 10),
}));
```

### 13. `map.config.ts` – Map provider

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('map', () => ({
  provider: process.env.MAP_PROVIDER || 'maptiler',
  apiKey: process.env.MAP_API_KEY,
  tilesBaseUrl: process.env.MAP_TILES_BASE_URL || 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png',
}));
```

### 14. `ai.config.ts` – AI provider (DeepSeek / OpenAI)

```ts
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
    requestTimeout: parseInt(process.env.DEEPSEEK_REQUEST_TIMEOUT || '30000', 10),
    monthlyBudget: parseFloat(process.env.DEEPSEEK_MONTHLY_BUDGET || '2'),
    rateLimitMinTime: parseInt(process.env.DEEPSEEK_RATE_LIMIT_MIN_TIME || '600', 10),
    rateLimitMaxConcurrent: parseInt(process.env.DEEPSEEK_RATE_LIMIT_MAX_CONCURRENT || '5', 10),
  },
}));
```

### 15. `otp.config.ts` – OTP settings

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('otp', () => ({
  ttl: parseInt(process.env.OTP_TTL || '300', 10),
  length: parseInt(process.env.OTP_LENGTH || '6', 10),
}));
```

### 16. `pixabay.config.ts` – Pixabay API (cho ảnh từ vựng) – **MỚI**

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('pixabay', () => ({
  apiKey: process.env.PIXABAY_API_KEY,
  apiUrl: process.env.PIXABAY_API_URL || 'https://pixabay.com/api/',
  timeout: parseInt(process.env.PIXABAY_TIMEOUT || '10000', 10),
  perPage: parseInt(process.env.PIXABAY_PER_PAGE || '3', 10),
}));
```

### 17. `validation.schema.ts` – Joi validation (cập nhật)

File này định nghĩa Joi schema cho tất cả biến môi trường. Nó đảm bảo:
- Các biến bắt buộc (required) phải có.
- Các biến optional có default value.
- Fail fast nếu thiếu biến required.

**Các nhóm chính được validate:** App, Database, Auth, Redis, Storage, Mail, Logger, Cache, Throttler, Pusher, PayOS, Queue, Map, AI, OTP, **Pixabay**, Pagination, CORS, Swagger, OpenTelemetry, Sentry.

**Thêm vào validation.schema.ts:**
```typescript
// Thêm vào object validationSchema
PIXABAY_API_KEY: Joi.string().optional(),
PIXABAY_API_URL: Joi.string().uri().optional(),
PIXABAY_TIMEOUT: Joi.number().integer().default(10000),
PIXABAY_PER_PAGE: Joi.number().integer().min(1).max(50).default(3),
```

## Cách sử dụng trong module

### 1. Import `ConfigModule` global trong `AppModule`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import storageConfig from './config/storage.config';
import mailConfig from './config/mail.config';
import loggerConfig from './config/logger.config';
import cacheConfig from './config/cache.config';
import throttlerConfig from './config/throttler.config';
import pusherConfig from './config/pusher.config';
import payosConfig from './config/payos.config';
import queueConfig from './config/queue.config';
import mapConfig from './config/map.config';
import aiConfig from './config/ai.config';
import otpConfig from './config/otp.config';
import pixabayConfig from './config/pixabay.config'; // 👈 thêm

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        redisConfig,
        storageConfig,
        mailConfig,
        loggerConfig,
        cacheConfig,
        throttlerConfig,
        pusherConfig,
        payosConfig,
        queueConfig,
        mapConfig,
        aiConfig,
        otpConfig,
        pixabayConfig, // 👈 thêm
      ],
      validationSchema,
      validationOptions: { abortEarly: false },
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
  ],
})
export class AppModule {}
```

### 2. Inject `ConfigService` trong service / guard / interceptor

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CardExternalService {
  constructor(private configService: ConfigService) {}

  getPixabayConfig() {
    return {
      apiKey: this.configService.get('pixabay.apiKey'),
      apiUrl: this.configService.get('pixabay.apiUrl'),
      perPage: this.configService.get('pixabay.perPage'),
    };
  }
}
```

### 3. Sử dụng typed config (khuyến nghị)

```ts
// Định nghĩa interface cho toàn bộ config
export interface Config {
  app: { port: number; env: string; /*...*/ };
  auth: { jwtSecret: string; /*...*/ };
  payos: { clientId: string; mode: 'sandbox' | 'production'; };
  pixabay: { apiKey?: string; apiUrl: string; timeout: number; perPage: number; };
  // ...
}

// Trong service
const apiKey = this.configService.get<string>('pixabay.apiKey');
```

## Quy tắc bắt buộc

| Quy tắc                                                                          | Mức độ     |
| -------------------------------------------------------------------------------- | ---------- |
| Validate env khi app khởi động (dùng Joi)                                        | **MUST**   |
| Truy cập config qua `ConfigService`, không đọc `process.env` trong business code | **MUST**   |
| Nhóm config theo mục đích, dùng `registerAs`                                     | **MUST**   |
| Có default value cho biến optional                                               | **MUST**   |
| Fail fast nếu thiếu biến required                                                | **MUST**   |
| Hỗ trợ override config cho test                                                  | **MUST**   |
| Phân biệt môi trường: `development`, `test`, `staging`, `production`             | **SHOULD** |
| Secret không hardcode, dùng env hoặc secret manager                              | **MUST**   |

## Anti-pattern bị cấm

- ❌ `process.env.JWT_SECRET` trong service.
- ❌ Hardcode URL, token, secret trong source code.
- ❌ Dùng cùng một secret cho access và refresh token.
- ❌ Không validate env → app chạy với biến thiếu gây lỗi khó hiểu.
- ❌ Config không có owner, không ai biết thay đổi thế nào.

## Checklist review

- [ ] Env đã được validate qua Joi chưa?
- [ ] Tất cả business code đều dùng `ConfigService`?
- [ ] Config được nhóm rõ ràng theo domain kỹ thuật?
- [ ] Có default value cho biến optional?
- [ ] Secret không commit lên git, chỉ đặt trong environment?
- [ ] Có hỗ trợ override cho test?
- [ ] Mỗi config file có export `registerAs` đúng tên namespace?
- [ ] `ConfigModule.forRoot` được import global một lần duy nhất?
- [ ] **Pixabay config đã được thêm và validate?** (nếu dùng)
```

Bạn có thể lưu file này thành `__DOCS/REVIEW/REVIEW-CONFIG.md`. Nội dung đã được cập nhật đầy đủ với Pixabay config.