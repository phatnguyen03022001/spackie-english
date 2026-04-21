# ============================================
# 1. App Configuration
# ============================================
NODE_ENV=development
APP_NAME=Spackie English
APP_PORT=8000
API_PREFIX=api
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_STAGING=https://spackieenglish.vercel.app
VERCEL_TEAM_SLUG=***REDACTED***

# ============================================
# 2. Database (MongoDB)
# ============================================
DATABASE_URL=mongodb+srv://***:***@***.mongodb.net/***?retryWrites=true&w=majority
DATABASE_POOL_SIZE=10
DATABASE_POOL_MIN=2

# ============================================
# 3. Authentication & Security
# ============================================
JWT_SECRET=***REDACTED***
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=***REDACTED***
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10

# ============================================
# 4. CORS
# ============================================
CORS_ALLOWED_ORIGINS=http://localhost:3000

# ============================================
# 5. Rate Limiting
# ============================================
THROTTLE_TTL=60
THROTTLE_LIMIT=100
THROTTLE_SHORT_TTL=1000
THROTTLE_SHORT_LIMIT=10
THROTTLE_MEDIUM_TTL=60000
THROTTLE_MEDIUM_LIMIT=100
THROTTLE_LONG_TTL=3600000
THROTTLE_LONG_LIMIT=1000

# ============================================
# 6. Caching & Idempotency
# ============================================
CACHE_DEFAULT_TTL=300
IDEMPOTENCY_TTL=86400
IDEMPOTENCY_ENABLE=true

# ============================================
# 7. Redis (Upstash)
# ============================================
REDIS_URL=rediss://***:***@***.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://***.upstash.io
UPSTASH_REDIS_REST_TOKEN=***REDACTED***

# ============================================
# 8. File Upload (Cloudinary)
# ============================================
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=***REDACTED***
CLOUDINARY_API_KEY=***REDACTED***
CLOUDINARY_API_SECRET=***REDACTED***

# ============================================
# 9. Email (Brevo / SMTP)
# ============================================
BREVO_API_KEY=***REDACTED***
EMAIL_FROM=***REDACTED***
EMAIL_FROM_NAME=Spackie English

# ============================================
# 10. WebSocket (Pusher)
# ============================================
PUSHER_APP_ID=***REDACTED***
PUSHER_KEY=***REDACTED***
PUSHER_SECRET=***REDACTED***
PUSHER_CLUSTER=ap1

# ============================================
# 11. Logging & OpenTelemetry
# ============================================
LOG_LEVEL=info
LOG_REQUEST_BODY=true
LOG_RESPONSE_BODY=true
LOG_BODY_IN_PROD=false

OTEL_SERVICE_NAME=spackies-english-nestjs
OTEL_EXPORTER_OTLP_ENDPOINT=https://***.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=authorization=Basic ***REDACTED***
OTEL_METRICS_EXPORTER=none

# ============================================
# 12. API Documentation (Swagger)
# ============================================
SWAGGER_ENABLE=true
SWAGGER_PATH=docs
SWAGGER_TITLE=Spackie English API
SWAGGER_DESCRIPTION=Spackie English Backend Documentation
SWAGGER_VERSION=1.0.0

# ============================================
# 13. Error Tracking (Sentry)
# ============================================
SENTRY_DSN=https://***@***.ingest.sentry.io/***

# ============================================
# 14. Node.js Runtime
# ============================================
NODE_OPTIONS="--max-old-space-size=512 --expose-gc"
DEFAULT_PAGE_SIZE=20

# ============================================
# 15. Payment (PayOS)
# ============================================
PAYOS_CLIENT_ID=lnm...
PAYOS_API_KEY=941...
PAYOS_CHECKSUM_KEY=738...
PAYOS_API_URL=https://api-merchant.payos.vn   # hoặc sandbox
PAYOS_MODE=sandbox                            # sandbox | production

# ============================================
# 16. Queue (Bull / BullMQ + Upstash Redis)
# ============================================
BULL_PREFIX=bull
BULL_COMPLETED_TTL=86400
BULL_FAILED_TTL=604800
# Các tuỳ chỉnh nâng cao nên đặt trong code, không qua env

# ============================================
# 17. Map (Maptiler)
# ============================================
MAP_PROVIDER=maptiler
MAP_API_KEY=***REDACTED***
MAP_TILES_BASE_URL=https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png

# ============================================
# 18. DeepSeek v3
# ============================================
AI_PROVIDER=deepseek
DEEPSEEK_ENABLED=true
DEEPSEEK_API_KEY=***REDACTED***
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_MAX_TOKENS=2000
DEEPSEEK_TEMPERATURE=0.7
DEEPSEEK_REQUEST_TIMEOUT=30000
DEEPSEEK_MONTHLY_BUDGET=2
DEEPSEEK_RATE_LIMIT_MIN_TIME=600      # milliseconds, 600 = 100 req/phút
DEEPSEEK_RATE_LIMIT_MAX_CONCURRENT=5   # số request đồng thời tối đa


# ============================================
# 19. OTP (dùng email)
# ============================================
OTP_TTL=300
OTP_LENGTH=6

# ============================================
# 20. Pixabay API (cho ảnh từ vựng)
# ============================================
PIXABAY_API_KEY=***REDACTED***
