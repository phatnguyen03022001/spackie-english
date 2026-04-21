# NestJS Backend Production Standard

> Version 2.1 — Production-ready, maintainable, scalable.  
> Stack: NestJS + Prisma + Redis, deploy on Render.

Tài liệu này **không phải “toàn năng cho mọi bài toán NestJS”**. Đây là **production standard mặc định** cho team: ưu tiên tính nhất quán, dễ review, dễ scale và giảm lỗi vận hành. Khi có ngoại lệ, phải ghi rõ lý do trong PR hoặc ADR thay vì tự ý lệch chuẩn.

### Cách đọc tài liệu này

- `MUST` / `BẮT BUỘC`: vi phạm là không đạt chuẩn.
- `SHOULD` / `NÊN`: chỉ được lệch khi có lý do rõ ràng.
- `MAY` / `CÓ THỂ`: tùy chọn theo ngữ cảnh.
- Ví dụ code trong tài liệu là **reference implementation**, không copy mù quáng nếu stack thực tế khác.

---

## Table of Contents

1. [Request Flow](#1-request-flow)
2. [Core Principles](#2-core-principles)
3. [Project Structure](#3-project-structure)
4. [Naming Convention](#4-naming-convention)
5. [Response Standard](#5-response-standard)
6. [Error Code Convention](#6-error-code-convention)
7. [DTO & Mapping Rules](#7-dto--mapping-rules)
8. [Validation](#8-validation)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Transaction Rules](#10-transaction-rules)
11. [Module Communication](#11-module-communication)
12. [Pagination Standard](#12-pagination-standard)
13. [Logging](#13-logging)
14. [Caching Strategy](#14-caching-strategy)
15. [Security](#15-security)
16. [CORS — Render + Vercel](#16-cors--render--vercel)
17. [Rate Limiting (Behind Proxy)](#17-rate-limiting-behind-proxy)
18. [File Upload Strategy](#18-file-upload-strategy)
19. [Database — Connection Pooling](#19-database--connection-pooling)
20. [API Documentation (Swagger)](#20-api-documentation-swagger)
21. [Testing](#21-testing)
22. [Background Jobs & Cron](#22-background-jobs--cron)
23. [Health Check](#23-health-check)
24. [Graceful Shutdown](#24-graceful-shutdown)
25. [API Versioning](#25-api-versioning)
26. [Soft Delete](#26-soft-delete)
27. [Idempotency Key](#27-idempotency-key)
28. [Deployment — Render](#28-deployment--render)
29. [Environment Variables](#29-environment-variables)
30. [Production Checklist](#30-production-checklist)
31. [GraphQL Standard](#31-graphql-standard)
32. [WebSocket & Realtime](#32-websocket--realtime)
33. [Microservices & Message Patterns](#33-microservices--message-patterns)
34. [Observability nâng cao](#34-observability-nang-cao)
35. [Security nâng cao](#35-security-nang-cao)
36. [CI/CD Pipeline](#36-cicd-pipeline)
37. [Disaster Recovery & Backup](#37-disaster-recovery--backup)
38. [Performance Tuning](#38-performance-tuning)
39. [Feature Flags & A/B Testing](#39-feature-flags--ab-testing)
40. [Data Migration & Prisma Operations](#40-data-migration--prisma-operations)

---

## 1. Request Flow

```
Client
 → Controller
 → Guard (Auth, Roles)
 → Interceptor (Logging, Cache, Transform, Idempotency)
 → Pipe (Validation)
 → Use Case (optional — business orchestration layer)
 → Service (core business logic)
 → Repository (data access)
 → Database / Cache
 ← Response (standardized via TransformInterceptor)
 ← Exception Filter (global — chuẩn hóa error format)
```

**Nguyên tắc một chiều:**

```
Controller → Service → Repository
```

Không bao giờ đi ngược lại hoặc bỏ qua tầng.

---

## 2. Core Principles

- **Separation of concerns** rõ ràng — Controller chỉ nhận/trả HTTP, Service xử lý logic, Repository xử lý data.
- **Không leak internal data** — luôn dùng Response DTO, không return Entity trực tiếp.
- **Không circular dependency** — nếu cần giao tiếp 2 chiều, dùng Event hoặc tạo module trung gian.
- **Feature-based structure** — tổ chức theo domain, không theo layer kỹ thuật thuần túy.
- **Testable by design** — mọi dependency phải inject, repository có thể mock.
- **Stateless** — không lưu state trong memory của process, dùng Redis / DB.
- **Fail fast** — validate input sớm nhất có thể (Pipe layer).
- **Explicit over implicit** — không dùng magic, ưu tiên code rõ ràng hơn clever.
- **Repository boundary rõ ràng** — Service không truy cập trực tiếp Prisma/ORM, chỉ thông qua Repository.

### 2.1 Quy tắc thực thi

- `MUST` mỗi HTTP request đi theo luồng `Controller -> Use Case (nếu có) -> Service -> Repository`.
- `MUST NOT` để Controller chứa business rule, transaction, query DB, hoặc mapping phức tạp.
- `MUST NOT` để Repository chứa business rule, permission rule, hoặc orchestration nhiều bước.
- `MUST` inject dependency qua constructor; không new class thủ công trong business code.
- `MUST` đặt tên rõ ràng theo intent nghiệp vụ, tránh `handle()`, `process()`, `data`, `item` nếu có thể đặt cụ thể hơn.
- `SHOULD` tách `use-cases/` khi flow có từ 2 service trở lên, có transaction, hoặc có orchestration ngoài CRUD đơn giản.

### 2.2 Anti-pattern bị cấm

- Gọi `prisma.*` trực tiếp trong Controller hoặc Guard.
- Return raw Prisma model, raw Mongo document, hoặc object chứa field nhạy cảm.
- Dùng `forwardRef()` để “chữa cháy” circular dependency mà không giải quyết boundary.
- Dùng `any`, `as any`, `as unknown as ...` để lách type nếu không có comment giải thích.
- Nhét logic validate nghiệp vụ vào DTO decorator khi logic đó cần gọi DB hoặc dependency khác.
- Bắt lỗi rồi nuốt lỗi (`catch {}` / `catch (e) { return null; }`) mà không log hoặc chuyển hóa rõ ràng.
- Viết helper/global util thao túng business logic của nhiều module mà không có owner rõ ràng.

---

## 3. Project Structure

``` 
src/
├── modules/                        # Feature modules — domain-driven
│   └── users/
│       ├── users.controller.ts
│       ├── users.service.ts
│       ├── users.repository.ts
│       ├── dto/
│       │   ├── create-user.dto.ts
│       │   ├── update-user.dto.ts
│       │   └── user-response.dto.ts
│       ├── use-cases/              # Optional — complex business flows
│       │   └── register-user.use-case.ts
│       └── users.module.ts
│
├── common/                         # Shared cross-cutting concerns
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   ├── cache.interceptor.ts
│   │   └── idempotency.interceptor.ts
│   ├── pipes/
│   │   └── parse-object-id.pipe.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── decorators/
│   │   ├── public.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── current-user.decorator.ts
│   └── utils/
│       ├── hash.util.ts
│       └── pagination.util.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── validation.schema.ts        # Joi validation cho env vars
│
├── database/
│   ├── prisma.service.ts
│   ├── migrations/
│   └── seed/
│
├── infrastructure/                 # External integrations / adapters
│   ├── redis/
│   ├── mail/
│   ├── storage/
│   ├── payment/
│   ├── ws/
│   └── third-party/
│
├── jobs/                           # Queue processors, schedulers, cron
│   ├── processors/
│   ├── schedulers/
│   └── jobs.module.ts
│
└── main.ts
```

### 6 folder chính

- `modules/` — toàn bộ business theo feature/domain
- `common/` — shared cross-cutting như guards, interceptors, filters, decorators
- `config/` — config app, env schema, config factory
- `database/` — prisma, migrations, seed, database bootstrap
- `infrastructure/` — Redis, WebSocket, mail, storage, payment, third-party APIs
- `jobs/` — background jobs, queue processors, cron, scheduler

### Quy tắc cấu trúc

- `MUST` group code theo feature/domain: `users`, `orders`, `auth`.
- `MUST NOT` tạo thư mục top-level kiểu `controllers/`, `services/`, `repositories/` cho toàn hệ thống.
- `MUST` colocate DTO, mapper, validator, use-case trong cùng module nếu chúng chỉ phục vụ module đó.
- `SHOULD` thêm `mappers/` khi module có từ 2 response DTO trở lên hoặc mapping logic không còn trivial.
- `SHOULD` thêm `interfaces/` hoặc `types/` trong module nếu contract nội bộ đủ lớn để tách riêng.
- `MUST` giữ `common/` chỉ cho cross-cutting concern thật sự dùng nhiều nơi. Cái gì chỉ thuộc một domain thì để lại trong domain đó.
- `MUST` giữ `infrastructure/` cho external integration và technical adapters, không đặt business rule ở đây.
- `MUST` giữ `jobs/` cho async/background processing; job chỉ orchestration, business logic vẫn nằm ở `modules/`.

---

## 4. Naming Convention

| Thành phần        | Quy tắc                    | Ví dụ                                   |
| ----------------- | -------------------------- | --------------------------------------- |
| Module            | PascalCase + `Module`      | `UsersModule`, `ProductsModule`         |
| Controller        | PascalCase + `Controller`  | `UsersController`                       |
| Service           | PascalCase + `Service`     | `UsersService`                          |
| Repository        | PascalCase + `Repository`  | `UsersRepository`                       |
| Use Case          | PascalCase + `UseCase`     | `RegisterUserUseCase`                   |
| Guard             | PascalCase + `Guard`       | `JwtAuthGuard`, `RolesGuard`            |
| Interceptor       | PascalCase + `Interceptor` | `LoggingInterceptor`                    |
| Filter            | PascalCase + `Filter`      | `HttpExceptionFilter`                   |
| Pipe              | PascalCase + `Pipe`        | `ParseObjectIdPipe`                     |
| Decorator (class) | PascalCase                 | `@Public()`                             |
| Decorator (func)  | camelCase                  | `@Roles('admin')`                       |
| DTO (input)       | PascalCase + `Dto`         | `CreateUserDto`, `UpdateUserDto`        |
| DTO (response)    | PascalCase + `ResponseDto` | `UserResponseDto`                       |
| Enum              | PascalCase + `Enum`        | `RoleEnum`, `OrderStatusEnum`           |
| Constant          | UPPER_SNAKE_CASE           | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`  |
| Env variable      | UPPER_SNAKE_CASE           | `DATABASE_URL`, `JWT_SECRET`            |
| Tên file          | kebab-case                 | `jwt-auth.guard.ts`, `users.service.ts` |
| Tên biến / hàm    | camelCase                  | `findAll()`, `cacheKey`, `isExpired`    |
| Tên class         | PascalCase                 | `UsersService`                          |
| Prisma model      | PascalCase (singular)      | `User`, `Product`, `Order`              |
| Database field    | camelCase (Prisma default) | `firstName`, `createdAt`, `deletedAt`   |
| Route path        | kebab-case (plural noun)   | `/users`, `/product-categories`         |

---

## 5. Response Standard

Toàn bộ response đi qua `TransformInterceptor` — không tự build response object trong controller.

### Quy tắc bắt buộc

- `MUST` chỉ có một response envelope chuẩn cho REST API đồng bộ.
- `MUST NOT` trả format khác nhau giữa các controller cho cùng loại endpoint.
- `MAY` bỏ qua envelope chỉ với các case đặc biệt: file stream, webhook callback yêu cầu raw body/response, SSE, hoặc redirect.
- `MUST` document rõ ngoại lệ nếu endpoint không dùng envelope chuẩn.

### 5.1 Success Response

```ts
interface SuccessResponse<T> {
  success: true;
  data: T | T[];
  meta?: PaginationMeta;
  message?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

**Ví dụ — single object:**

```json
{
  "success": true,
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "user@example.com",
    "fullName": "Nguyen Van A"
  }
}
```

**Ví dụ — list với pagination:**

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 105,
    "totalPages": 6
  }
}
```

**Ví dụ — action không trả data:**

```json
{
  "success": true,
  "data": null,
  "message": "User deleted successfully"
}
```

### 5.2 Error Response

```ts
interface ErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;       // DOMAIN_ACTION_REASON
    message: string;    // Human readable, có thể i18n
    details?: any;      // Validation errors (chỉ ở dev/staging)
  };
  path: string;
  timestamp: string;    // ISO 8601
}
```

**Ví dụ:**

```json
{
  "success": false,
  "statusCode": 404,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with id 123 does not exist"
  },
  "path": "/api/v1/users/123",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 5.3 TransformInterceptor

```ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data?.data ?? data,
        meta: data?.meta,
        message: data?.message,
      })),
    );
  }
}
```

### 5.4 Global Exception Filter

```ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errorCode =
      typeof exceptionResponse === 'object' && exceptionResponse['code']
        ? exceptionResponse['code']
        : 'INTERNAL_SERVER_ERROR';

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse['message']
        ? exceptionResponse['message']
        : 'An unexpected error occurred';

    // Không expose stack trace ở production
    const isProd = process.env.NODE_ENV === 'production';

    response.status(status).json({
      success: false,
      statusCode: status,
      error: {
        code: errorCode,
        message,
        ...(!isProd && exception instanceof Error
          ? { stack: exception.stack }
          : {}),
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 6. Error Code Convention

**Format:** `DOMAIN_ACTION_REASON` (UPPER_SNAKE_CASE)

| Phần     | Ý nghĩa           | Ví dụ                       |
| -------- | ----------------- | --------------------------- |
| `DOMAIN` | Module / resource | `USER`, `AUTH`, `ORDER`     |
| `ACTION` | Hành động         | `CREATE`, `FETCH`, `DELETE` |
| `REASON` | Lý do thất bại    | `NOT_FOUND`, `DUPLICATE`    |

**Danh sách chuẩn:**

```
# Auth
AUTH_INVALID_CREDENTIALS
AUTH_INVALID_TOKEN
AUTH_TOKEN_EXPIRED
AUTH_TOKEN_REVOKED
AUTH_REFRESH_TOKEN_REUSED      # Token family violation
AUTH_INSUFFICIENT_PERMISSIONS

# User
USER_NOT_FOUND
USER_EMAIL_DUPLICATE
USER_ACCOUNT_DISABLED

# File
FILE_TOO_LARGE
FILE_TYPE_NOT_ALLOWED
FILE_UPLOAD_FAILED

# Order
ORDER_NOT_FOUND
ORDER_ALREADY_CANCELLED
ORDER_PAYMENT_FAILED

# Generic
VALIDATION_ERROR
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR
```

**Sử dụng:**

```ts
throw new NotFoundException({
  code: 'USER_NOT_FOUND',
  message: `User with id ${id} does not exist`,
});

throw new ConflictException({
  code: 'USER_EMAIL_DUPLICATE',
  message: 'Email already in use',
});
```

---

## 7. DTO & Mapping Rules

### Quy tắc bắt buộc

- **Không bao giờ return Entity / Prisma model trực tiếp** — tránh leak field nhạy cảm, circular reference.
- **Input DTO** — validate bằng `class-validator`.
- **Response DTO** — dùng `plainToInstance` với `excludeExtraneousValues: true`.

### Response DTO

```ts
import { Expose, Exclude, Type } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  fullName: string;

  @Expose()
  role: string;

  @Expose()
  createdAt: Date;

  // Không @Expose() → tự động bị loại bỏ
  password: string;
  refreshToken: string;
}
```

### Mapping trong Controller

```ts
@Get(':id')
async findOne(@Param('id') id: string): Promise<UserResponseDto> {
  const user = await this.usersService.findOne(id);
  return plainToInstance(UserResponseDto, user, {
    excludeExtraneousValues: true,
  });
}
```

### Nested DTO

```ts
export class OrderResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
```

---

## 8. Validation

### Global ValidationPipe (main.ts)

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,               // Tự động loại bỏ field thừa
    forbidNonWhitelisted: true,    // Throw error nếu có field lạ
    transform: true,               // Auto-transform type (string → number, v.v.)
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

### Input DTO examples

```ts
export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase and number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### Validation với custom message

```ts
@IsEnum(RoleEnum, {
  message: `role must be one of: ${Object.values(RoleEnum).join(', ')}`,
})
role: RoleEnum;
```

---

## 9. Authentication & Authorization

### 9.1 JWT Strategy

- **Access token** — TTL: 15 phút (production), 1 giờ (staging).
- **Refresh token** — TTL: 7 ngày. Hash bằng bcrypt trước khi lưu.
- **Token family** — phát hiện refresh token reuse attack.

### 9.2 Refresh Token Storage (Redis)

```ts
interface RefreshTokenPayload {
  userId: string;
  deviceId: string;       // UUID, tạo lúc login — hỗ trợ multi-device
  familyId: string;       // UUID, tạo lúc login đầu tiên — detect reuse
  tokenVersion: number;   // Tăng mỗi lần rotate
}

// Redis key format
`auth:refresh:${userId}:${deviceId}`

// TTL = JWT_REFRESH_EXPIRES_IN
```

### 9.3 Refresh Token Rotation

```ts
async refreshTokens(userId: string, deviceId: string, incomingToken: string) {
  const stored = await this.redis.get(`auth:refresh:${userId}:${deviceId}`);

  if (!stored) {
    // Token đã bị thu hồi hoặc expired
    throw new UnauthorizedException({ code: 'AUTH_TOKEN_REVOKED' });
  }

  const isValid = await bcrypt.compare(incomingToken, stored.hashedToken);

  if (!isValid) {
    // Token family violation — có thể bị đánh cắp
    // Thu hồi toàn bộ session của user này
    await this.revokeAllSessions(userId);
    throw new UnauthorizedException({ code: 'AUTH_REFRESH_TOKEN_REUSED' });
  }

  // Rotate: xóa cũ, tạo mới
  await this.redis.del(`auth:refresh:${userId}:${deviceId}`);
  return this.issueTokens(userId, deviceId);
}
```

### 9.4 Guards

```ts
// Bảo vệ toàn bộ app, dùng @Public() để bypass
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

### 9.5 Decorators

```ts
// @Public() — bỏ qua JWT guard
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// @Roles() — phân quyền theo role
export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);

// @CurrentUser() — lấy user từ request
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);
```

### 9.6 Sử dụng trong Controller

```ts
@Roles(RoleEnum.ADMIN)
@Get('admin/users')
getAdminData(@CurrentUser() user: JwtPayload) { ... }

@Public()
@Post('auth/login')
login(@Body() dto: LoginDto) { ... }
```

---

## 10. Transaction Rules

### Nguyên tắc bắt buộc

- **Chỉ mở transaction ở tầng Service** — không mở ở Repository hoặc Controller.
- **Một request = một transaction duy nhất** — không lồng nhiều transaction.
- **Truyền transaction client** qua tham số khi cần gọi nhiều service.
- **Không gọi external side effects trong transaction** — không gửi email, không publish event ra queue, không gọi webhook khi transaction chưa commit.
- **Nếu cần side effect sau commit** — dùng outbox pattern hoặc tách bước xử lý sau khi transaction thành công.

### Prisma transaction

```ts
// Service — mở transaction ở đây
async createUserWithProfile(dto: CreateUserDto) {
  return this.prisma.$transaction(async (tx) => {
    const user = await this.usersRepository.create(dto, tx);
    await this.profilesRepository.create({ userId: user.id }, tx);
    return user;
  });
}
```

```ts
// Sau khi transaction commit xong mới phát side effect
async createUserWithProfile(dto: CreateUserDto) {
  const user = await this.prisma.$transaction(async (tx) => {
    const createdUser = await this.usersRepository.create(dto, tx);
    await this.profilesRepository.create({ userId: createdUser.id }, tx);
    return createdUser;
  });

  await this.eventEmitter.emitAsync('user.created', {
    userId: user.id,
    email: user.email,
  });

  return user;
}
```

### Repository nhận transaction client

```ts
// Repository
async create(dto: CreateUserDto, tx?: Prisma.TransactionClient) {
  const client = tx ?? this.prisma;
  return client.user.create({ data: dto });
}
```

### Khi nào cần transaction

| Trường hợp                         | Cần transaction |
| ---------------------------------- | --------------- |
| Tạo 1 record đơn giản              | Không           |
| Tạo nhiều record liên quan nhau    | Có              |
| Update + delete trong cùng request | Có              |
| Thanh toán, trừ số dư              | Có (bắt buộc)   |
| Chỉ đọc dữ liệu                    | Không           |

---

## 11. Module Communication

### Không được

```ts
// ❌ Import Service của module khác trực tiếp → dễ circular dependency
@Module({
  imports: [UsersModule, ProductsModule],  // OK nếu một chiều
})

// ❌ forwardRef — chỉ dùng khi thực sự không có cách nào khác
```

### Nên dùng

**Option 1 — Event Emitter (async, loosely coupled):**

```ts
// Sau khi tạo user, emit event để các module khác xử lý
this.eventEmitter.emit('user.created', { userId: user.id, email: user.email });

// Module Email lắng nghe
@OnEvent('user.created')
async handleUserCreated(payload: UserCreatedEvent) {
  await this.sendWelcomeEmail(payload.email);
}
```

**Option 2 — Shared Module (cho common logic):**

```ts
// Tạo module trung gian nếu nhiều module cần dùng chung
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

**Option 3 — Message Queue (Bull) cho xử lý nặng:**

```ts
await this.emailQueue.add('send-welcome', { userId, email }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});
```

---

## 12. Pagination Standard

### Request

```
GET /users?page=1&limit=20&sort=createdAt:desc&search=nguyen
```

### PaginationQueryDto

```ts
export class PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;

  @IsOptional()
  @IsString()
  sort?: string;  // format: "field:asc" hoặc "field:desc"

  @IsOptional()
  @IsString()
  search?: string;
}
```

### Utility helper

```ts
export function parseSortQuery(sort?: string): { field: string; order: 'asc' | 'desc' } {
  if (!sort) return { field: 'createdAt', order: 'desc' };
  const [field, order] = sort.split(':');
  return { field, order: order === 'asc' ? 'asc' : 'desc' };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
```

### Repository pattern

```ts
async findAll(query: PaginationQueryDto) {
  const { page, limit, search } = query;
  const { field, order } = parseSortQuery(query.sort);
  const skip = (page - 1) * limit;

  const where = search
    ? { OR: [{ email: { contains: search } }, { fullName: { contains: search } }] }
    : {};

  const [data, total] = await Promise.all([
    this.prisma.user.findMany({ where, skip, take: limit, orderBy: { [field]: order } }),
    this.prisma.user.count({ where }),
  ]);

  return { data, meta: buildPaginationMeta(total, page, limit) };
}
```

---

## 13. Logging

### Thông tin bắt buộc mỗi request

```ts
{
  requestId: string;    // từ header X-Request-Id hoặc tự sinh UUID
  userId?: string;      // nếu đã auth
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
  userAgent: string;
}
```

### Không bao giờ log

- `password`, `token`, `refreshToken`, `secret`
- Credit card numbers
- Full request body nếu chứa sensitive data

### Quy tắc bổ sung

- `MUST` dùng structured logging (JSON hoặc object), không log chuỗi ad-hoc khó parse.
- `MUST` propagate `requestId` xuyên suốt request, queue job, và external call nếu có thể.
- `MUST` redact field nhạy cảm trước khi log.
- `SHOULD` thêm `module`, `action`, `entityId` cho log business quan trọng.

### LoggingInterceptor

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const requestId = req.headers['x-request-id'] as string ?? randomUUID();
    const start = Date.now();

    req['requestId'] = requestId;

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          this.logger.log({
            requestId,
            userId: req['user']?.id,
            method: req.method,
            path: req.url,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
          });
        },
        error: (err) => {
          this.logger.error({
            requestId,
            method: req.method,
            path: req.url,
            error: err.message,
            stack: err.stack,
            durationMs: Date.now() - start,
          });
        },
      }),
    );
  }
}
```

### Log levels theo môi trường

| Level   | Development | Production |
| ------- | ----------- | ---------- |
| `debug` | ✅           | ❌          |
| `log`   | ✅           | ✅          |
| `warn`  | ✅           | ✅          |
| `error` | ✅           | ✅          |

---

## 14. Caching Strategy

### Nguyên tắc

- **Chỉ cache GET requests** — idempotent, không thay đổi state.
- **Cache key format:** `{domain}:{resource}:{identifier}` hoặc `{domain}:{resource}:page:{page}:limit:{limit}`
- **Invalidation bắt buộc** khi CREATE / UPDATE / DELETE.
- **Không dùng Redis `KEYS` ở production path** — dùng `SCAN` hoặc versioned key để tránh block Redis.

### Cache key examples

```
users:123
users:list:page:1:limit:20
products:slug:iphone-15
products:list:category:phones:page:1
```

### Cache TTL

| Loại dữ liệu                  | TTL    |
| ----------------------------- | ------ |
| User profile                  | 300s   |
| Product detail                | 600s   |
| List với pagination           | 60s    |
| Config / static data          | 3600s  |
| Realtime / frequently updated | 10–30s |

### Invalidation pattern

```ts
// Service — sau khi update, xóa cache liên quan
async updateUser(id: string, dto: UpdateUserDto) {
  const user = await this.usersRepository.update(id, dto);

  await this.cacheManager.del(`users:${id}`);
  // Xóa list cache bằng scan pattern, không dùng Redis KEYS trong production
  await this.invalidatePattern('users:list:*');

  return user;
}

async invalidatePattern(pattern: string) {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length) {
      await this.redis.del(...keys);
    }
  } while (cursor !== '0');
}
```

### Tránh Cache Stampede

```ts
async getUser(id: string): Promise<User> {
  const cacheKey = `users:${id}`;
  const cached = await this.cacheManager.get<User>(cacheKey);
  if (cached) return cached;

  // Dùng mutex để tránh nhiều request cùng lúc query DB
  return this.lockService.withLock(cacheKey, async () => {
    // Double-check sau khi có lock
    const recheck = await this.cacheManager.get<User>(cacheKey);
    if (recheck) return recheck;

    const user = await this.usersRepository.findOne(id);
    await this.cacheManager.set(cacheKey, user, 300);
    return user;
  });
}
```

---

## 15. Security

### Bắt buộc trong production

```ts
// main.ts
import helmet from 'helmet';

app.use(helmet());

app.enableCors({
  // Xem mục 16 — CORS config riêng cho Vercel + Render
});

// Rate limiting — xem mục 17
```

### Input sanitization

- `whitelist: true` + `forbidNonWhitelisted: true` trong ValidationPipe đã xử lý field lạ.
- Nếu nhận HTML input, dùng `sanitize-html` trước khi lưu DB.
- Không bao giờ build raw SQL từ user input (Prisma đã parameterize).

### Secrets

- Không bao giờ commit `.env` lên git.
- Rotate JWT secret nếu bị lộ → tất cả token hiện tại bị invalidate.
- Dùng khác nhau `JWT_SECRET` và `JWT_REFRESH_SECRET`.

---

## 16. CORS — Render + Vercel

### Vấn đề thực tế

Vercel tạo preview URL động: `project-git-branchname-team.vercel.app` — CORS tĩnh sẽ block hết preview deployments.

### Config CORS động

```ts
// config/cors.config.ts
export function getCorsOptions(): CorsOptions {
  const allowedOrigins = [
    process.env.FRONTEND_URL,               // Production: https://myapp.com
    process.env.FRONTEND_URL_STAGING,       // Staging: https://staging.myapp.com
  ].filter(Boolean);

  // Regex cho Vercel preview URLs
  const vercelPreviewPattern = /^https:\/\/myapp-[a-z0-9-]+-myteam\.vercel\.app$/;

  return {
    origin: (origin, callback) => {
      // Cho phép request không có origin (mobile app, Postman, curl)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== 'production' && vercelPreviewPattern.test(origin)) ||
        (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost'))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'Idempotency-Key',
    ],
  };
}
```

```ts
// main.ts
app.enableCors(getCorsOptions());
```

### Environment variables cần thiết

```
FRONTEND_URL=https://myapp.com
FRONTEND_URL_STAGING=https://staging.myapp.com
VERCEL_TEAM_SLUG=myteam           # Dùng để build regex preview URL
```

---

## 17. Rate Limiting (Behind Proxy)

### Vấn đề

Render đặt app sau reverse proxy. Nếu không config `trustProxy`, `ThrottlerGuard` sẽ rate-limit theo IP của proxy → toàn bộ user bị chung một bucket.

### Config đúng

```ts
// main.ts
app.set('trust proxy', 1);  // Tin tưởng 1 layer proxy (Render)
```

```ts
// app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,          // 1 giây
    limit: 10,          // 10 requests
  },
  {
    name: 'medium',
    ttl: 60000,         // 1 phút
    limit: 100,
  },
  {
    name: 'long',
    ttl: 3600000,       // 1 giờ
    limit: 1000,
  },
]),
```

### Custom ThrottlerGuard lấy IP thật

```ts
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Ưu tiên bucket theo user đã auth, fallback sang IP thật
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    return `ip:${ip}`;
  }
}
```

### Quy tắc

- `MUST` rate limit theo `userId` cho endpoint đã auth nếu có thể.
- `MUST` rate limit theo IP cho endpoint public, login, signup, forgot-password.
- `SHOULD` tách policy riêng cho auth endpoints thay vì dùng bucket mặc định toàn app.

### Override per endpoint

```ts
// Endpoint login — limit chặt hơn
@Throttle({ short: { ttl: 60000, limit: 5 } })
@Post('auth/login')
login() { ... }

// Endpoint public — không rate limit
@SkipThrottle()
@Get('health')
health() { ... }
```

---

## 18. File Upload Strategy

### Vấn đề với Render

Render không có persistent filesystem (ephemeral disk). **Không bao giờ lưu file local** — file sẽ mất sau mỗi lần deploy.

### Giải pháp: Cloudflare R2 (hoặc AWS S3)

```ts
// config
STORAGE_PROVIDER=cloudflare-r2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=my-bucket
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### Upload Service

```ts
@Injectable()
export class StorageService {
  private readonly s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    const ext = path.extname(file.originalname);
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }

  async delete(url: string): Promise<void> {
    const key = url.replace(`${process.env.R2_PUBLIC_URL}/`, '');
    await this.s3.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
  }
}
```

### File validation

```ts
// Multer config
MulterModule.register({
  storage: memoryStorage(),   // Không lưu disk, giữ trong memory
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB
  },
  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new BadRequestException({
        code: 'FILE_TYPE_NOT_ALLOWED',
        message: `File type ${file.mimetype} not allowed`,
      }), false);
    }
  },
}),
```

---

## 19. Database — Connection Pooling

### Vấn đề

MongoDB Atlas free tier giới hạn connections. Mỗi instance NestJS trên Render tạo nhiều connections → dễ hết pool khi scale.

### Prisma với MongoDB

```ts
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Connection string với pool size

```
# MongoDB Atlas — giới hạn connection pool
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/db?maxPoolSize=10&minPoolSize=2"
```

### Lưu ý với MongoDB + Prisma transaction

```ts
// MongoDB chỉ hỗ trợ transaction nếu dùng Replica Set
// MongoDB Atlas (free tier M0) KHÔNG hỗ trợ transaction
// Nếu cần transaction → upgrade lên M10+ hoặc dùng PostgreSQL

// Kiểm tra trước khi dùng $transaction với MongoDB
```

| Atlas Tier | Transaction Support |
| ---------- | ------------------- |
| M0 (Free)  | ❌ Không hỗ trợ      |
| M2, M5     | ❌ Không hỗ trợ      |
| M10+       | ✅ Hỗ trợ            |
| PostgreSQL | ✅ Luôn hỗ trợ       |

---

## 20. API Documentation (Swagger)

```ts
// main.ts
if (process.env.SWAGGER_ENABLE === 'true') {
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(process.env.API_URL ?? 'http://localhost:3000')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,  // Giữ token sau khi refresh trang
    },
  });
}
```

### Decorators chuẩn

```ts
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'USER_NOT_FOUND' })
  @Get(':id')
  findOne(@Param('id') id: string) { ... }
}
```

---

## 21. Testing

### Structure

```
test/
├── unit/
│   ├── users/
│   │   ├── users.service.spec.ts
│   │   └── users.repository.spec.ts
│   └── auth/
│       └── auth.service.spec.ts
└── e2e/
    ├── users.e2e-spec.ts
    └── jest-e2e.config.js
```

### Quy tắc

- **Unit test** — mock hoàn toàn repository, không gọi DB thật.
- **E2E test** — dùng database riêng (MongoDB Memory Server hoặc Docker Compose).
- **Coverage threshold** — tối thiểu 80% statement coverage ở Service layer.
- Không test business logic qua Controller — chỉ test routing, guard, pipe.

### Unit test Service

```ts
describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      repository.findOne.mockResolvedValue(mockUser);
      const result = await service.findOne('123');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### E2E test

```ts
describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply same global pipes/filters as main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  it('GET /users/:id — 404 when not found', () => {
    return request(app.getHttpServer())
      .get('/users/nonexistent')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
      });
  });
});
```

---

## 22. Background Jobs & Cron

### Khi nào dùng queue

- Gửi email, push notification
- Export CSV / Excel lớn
- Xử lý ảnh, video
- Tác vụ mất hơn 2 giây

### Không bao giờ xử lý nặng trong request — push vào queue ngay.

### Bull Queue setup

```ts
// email.processor.ts
@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send-welcome')
  async handleWelcome(job: Job<{ userId: string; email: string }>) {
    this.logger.log(`Processing job ${job.id} for ${job.data.email}`);
    try {
      await this.emailService.sendWelcome(job.data);
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      throw error;  // Bull sẽ retry tự động
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`);
    // Gửi alert đến Sentry
  }
}
```

### Job options chuẩn

```ts
await this.emailQueue.add('send-welcome', { userId, email }, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,    // 2s, 4s, 8s
  },
  removeOnComplete: 100,  // Giữ 100 completed jobs cuối
  removeOnFail: 500,
});
```

### Cron Job

```ts
@Injectable()
export class CleanupCronService {
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'cleanup-expired-tokens' })
  async cleanupExpiredTokens() {
    const count = await this.authRepository.deleteExpiredTokens();
    this.logger.log(`Cleaned up ${count} expired tokens`);
  }
}
```

---

## 23. Health Check

### Endpoint

```
GET /health        → liveness (app đang chạy không)
GET /health/ready  → readiness (app sẵn sàng nhận traffic chưa)
```

### Implementation

```ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

### Response

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

---

## 24. Graceful Shutdown

Bắt buộc để không mất request đang xử lý khi Render deploy version mới.

```ts
// main.ts
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();

// Timeout cho graceful shutdown — đủ thời gian xử lý request hiện tại
process.on('SIGTERM', async () => {
  await app.close();
  process.exit(0);
});
```

```ts
// prisma.service.ts — đã đặt trong OnModuleDestroy
async onModuleDestroy() {
  await this.$disconnect();
}

// redis.service.ts
async onModuleDestroy() {
  await this.redis.quit();
}

// bull queues — tự động đóng khi module destroy
```

### Thứ tự shutdown đúng

1. Stop accepting new HTTP requests (NestJS tự xử lý)
2. Wait for in-flight requests to complete
3. Close Bull queues (ngừng nhận job mới)
4. Disconnect Prisma
5. Disconnect Redis
6. Exit process

---

## 25. API Versioning

### URI Versioning (khuyến nghị)

```
/api/v1/users
/api/v2/users
```

```ts
// main.ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
  prefix: 'v',
});
```

```ts
@Controller({ path: 'users', version: '1' })
export class UsersV1Controller { ... }

@Controller({ path: 'users', version: '2' })
export class UsersV2Controller { ... }
```

### Quy tắc versioning

- Increment version khi có **breaking change** (xóa field, đổi format response).
- Thêm field mới vào response là non-breaking — không cần version mới.
- Deprecate version cũ trước khi xóa tối thiểu **3 tháng**.
- Thông báo deprecation qua header: `Deprecation: true`, `Sunset: Sat, 01 Jun 2025 00:00:00 GMT`.

---

## 26. Soft Delete

### Schema (Prisma)

```prisma
model User {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  email     String    @unique
  deletedAt DateTime?

  @@index([deletedAt])
}
```

### Repository pattern

```ts
// Mặc định — chỉ lấy record chưa xóa
async findOne(id: string): Promise<User | null> {
  return this.prisma.user.findFirst({
    where: { id, deletedAt: null },
  });
}

// Khi cần lấy cả đã xóa (admin, audit)
async findOneIncludeDeleted(id: string): Promise<User | null> {
  return this.prisma.user.findFirst({ where: { id } });
}

// Soft delete
async softDelete(id: string): Promise<void> {
  await this.prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// Hard delete — chỉ dùng khi cần thiết (GDPR request, v.v.)
async hardDelete(id: string): Promise<void> {
  await this.prisma.user.delete({ where: { id } });
}
```

### Lưu ý

- Luôn thêm index trên `deletedAt` để query không bị chậm.
- Với unique constraint (email), cần xử lý trường hợp user bị soft-delete nhưng email vẫn bị lock. Giải pháp: thêm suffix vào email khi soft delete hoặc dùng composite unique.

---

## 27. Idempotency Key

### Mục đích

Tránh duplicate khi client retry request (mạng chập, timeout): tạo đơn hàng 2 lần, thanh toán 2 lần.

### Flow

```
Client → gửi header Idempotency-Key: <UUID-v4>
Server → kiểm tra key theo scope `method + path + actor + key` trong Redis
  → Có: trả response cũ (không xử lý lại)
  → Không có: xử lý bình thường + lưu response vào Redis (TTL 24h)
```

### IdempotencyInterceptor

```ts
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!idempotencyKey) return next.handle();

    const actorId = req['user']?.id ?? 'anonymous';
    const cacheKey = `idempotency:${req.method}:${req.route?.path ?? req.path}:${actorId}:${idempotencyKey}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      const res = context.switchToHttp().getResponse<Response>();
      res.setHeader('X-Idempotency-Replayed', 'true');
      return of(cached);
    }

    return next.handle().pipe(
      tap(async (data) => {
        await this.cacheManager.set(cacheKey, data, 86400);  // 24h
      }),
    );
  }
}
```

### Áp dụng

```ts
// Chỉ dùng cho POST/PUT/PATCH quan trọng
@UseInterceptors(IdempotencyInterceptor)
@Post('orders')
createOrder(@Body() dto: CreateOrderDto) { ... }

@UseInterceptors(IdempotencyInterceptor)
@Post('payments')
processPayment(@Body() dto: PaymentDto) { ... }
```

### Quy tắc bắt buộc

- `MUST` scope key theo `method + route + actor`, không chỉ theo header value.
- `MUST NOT` replay response giữa hai user khác nhau hoặc hai endpoint khác nhau.
- `SHOULD` chỉ cache successful response (`2xx`) hoặc kết quả đã xác định rõ là safe để replay.
- `MAY` yêu cầu header `Idempotency-Key` là bắt buộc cho payment/order endpoint thay vì optional.

---

## 28. Deployment — Render

### Build & Start Commands

```bash
# Build command
npm install && npx prisma generate && npm run build

# Start command
node dist/main.js
```

### Render Environment Variables

Đặt tất cả trong Render Dashboard → Environment. Không dùng `.env` file trong production.

### Cold Start (Free Tier)

Render free tier bị spin down sau 15 phút không có traffic → cold start ~30 giây.

**Giải pháp:**
- Upgrade lên Starter ($7/tháng) — không có cold start.
- Hoặc dùng cron job ping `/health` mỗi 14 phút (không chính thức, Render có thể thay đổi behavior).

### Zero-downtime Deploy

Render tự động zero-downtime với health check. Config trong `render.yaml`:

```yaml
services:
  - type: web
    name: my-api
    env: node
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: node dist/main.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
```

### Database Migration

```bash
# Chạy trong build step (trước khi start app)
# Thêm vào build command:
npx prisma migrate deploy

# KHÔNG dùng prisma migrate dev trong production
```

---

## 29. Environment Variables

Validate tất cả env vars khi app start — fail fast nếu thiếu biến bắt buộc.

### Quy tắc

- `MUST` truy cập env thông qua `ConfigService` hoặc config factory, không đọc `process.env.*` rải rác khắp code business.
- `MUST` gom config theo nhóm (`app`, `auth`, `database`, `redis`, `storage`) để dễ test và refactor.
- `SHOULD` map env sang typed config object thay vì truyền string raw nhiều nơi.

```ts
// config/validation.schema.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  APP_PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('/api'),

  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  REDIS_URL: Joi.string().required(),

  FRONTEND_URL: Joi.string().uri().required(),
  FRONTEND_URL_STAGING: Joi.string().uri().optional(),

  SWAGGER_ENABLE: Joi.boolean().default(false),

  RATE_LIMIT_TTL: Joi.number().default(60000),
  RATE_LIMIT_LIMIT: Joi.number().default(100),

  R2_ACCOUNT_ID: Joi.string().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET_NAME: Joi.string().optional(),
  R2_PUBLIC_URL: Joi.string().uri().optional(),
});
```

```ts
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema,
  validationOptions: {
    abortEarly: false,  // Hiển thị tất cả lỗi, không dừng ở lỗi đầu tiên
  },
}),
```

### Danh sách đầy đủ

| Variable                 | Required | Default | Mô tả                                  |
| ------------------------ | -------- | ------- | -------------------------------------- |
| `NODE_ENV`               | ✅        | —       | `development` / `production` / `test`  |
| `APP_PORT`               | ❌        | `3000`  | Cổng app                               |
| `API_PREFIX`             | ❌        | `/api`  | Prefix cho tất cả routes               |
| `DATABASE_URL`           | ✅        | —       | MongoDB / PostgreSQL connection string |
| `JWT_SECRET`             | ✅        | —       | Min 32 chars                           |
| `JWT_EXPIRES_IN`         | ❌        | `15m`   | Access token TTL                       |
| `JWT_REFRESH_SECRET`     | ✅        | —       | Min 32 chars, khác JWT_SECRET          |
| `JWT_REFRESH_EXPIRES_IN` | ❌        | `7d`    | Refresh token TTL                      |
| `REDIS_URL`              | ✅        | —       | Upstash Redis URL                      |
| `FRONTEND_URL`           | ✅        | —       | Production frontend URL (CORS)         |
| `FRONTEND_URL_STAGING`   | ❌        | —       | Staging frontend URL (CORS)            |
| `SWAGGER_ENABLE`         | ❌        | `false` | Bật Swagger docs                       |
| `RATE_LIMIT_TTL`         | ❌        | `60000` | Rate limit window (ms)                 |
| `RATE_LIMIT_LIMIT`       | ❌        | `100`   | Max requests per window                |
| `R2_ACCOUNT_ID`          | ❌        | —       | Cloudflare R2 (nếu dùng file upload)   |
| `R2_ACCESS_KEY_ID`       | ❌        | —       |                                        |
| `R2_SECRET_ACCESS_KEY`   | ❌        | —       |                                        |
| `R2_BUCKET_NAME`         | ❌        | —       |                                        |
| `R2_PUBLIC_URL`          | ❌        | —       | Public URL của R2 bucket               |

---

## 30. Production Checklist

### Trước khi release

#### Architecture

- [ ] Controller không chứa business logic — chỉ nhận/trả HTTP
- [ ] Service không gọi trực tiếp `prisma` — đi qua Repository
- [ ] Không có circular dependency giữa các module
- [ ] Response DTO dùng `@Expose()` — không leak entity
- [ ] Không có anti-pattern bị cấm: `forwardRef()` chữa cháy, `any` bừa bãi, raw Prisma trong Controller/Guard
- [ ] External side effects không chạy bên trong DB transaction

#### Validation & Security

- [ ] Global ValidationPipe với `whitelist: true`, `forbidNonWhitelisted: true`
- [ ] Auth guard bảo vệ tất cả endpoint (dùng `@Public()` để opt-out)
- [ ] Roles guard cho endpoint cần phân quyền
- [ ] Helmet được bật
- [ ] CORS config đúng với Vercel preview URLs
- [ ] Rate limiting với `trust proxy` config đúng
- [ ] JWT_SECRET và JWT_REFRESH_SECRET khác nhau, min 32 chars

#### Response & Error

- [ ] Global exception filter trả đúng format `{ success, statusCode, error, path, timestamp }`
- [ ] Error codes theo format `DOMAIN_ACTION_REASON`
- [ ] Không expose stack trace ở production

#### Database & Cache

- [ ] Connection pool size phù hợp với Atlas tier
- [ ] MongoDB transaction chỉ dùng nếu Atlas M10+
- [ ] Soft delete có index trên `deletedAt`
- [ ] Cache invalidation khi data thay đổi
- [ ] Không dùng Redis `KEYS` trong request path production
- [ ] Prisma migrate deploy trong build step

#### Logging & Monitoring

- [ ] LoggingInterceptor ghi `requestId`, `userId`, `durationMs`
- [ ] Không log password, token, secret
- [ ] Sentry (hoặc tương đương) để catch error production

#### Background Jobs

- [ ] Queue có retry với exponential backoff
- [ ] Failed jobs được log và alert
- [ ] Không xử lý tác vụ nặng trong HTTP request

#### Infrastructure

- [ ] Health check endpoint hoạt động
- [ ] Graceful shutdown — đóng Prisma và Redis khi SIGTERM
- [ ] Environment variables validate khi start (Joi)
- [ ] Không đọc `process.env` trực tiếp trong business modules
- [ ] Swagger chỉ bật ở dev/staging (`SWAGGER_ENABLE=false` ở production)
- [ ] File upload không lưu local (dùng R2/S3)
- [ ] Idempotency key cho POST tạo đơn hàng, thanh toán

#### Testing

- [ ] Unit test Service layer, coverage ≥ 80%
- [ ] E2E test các flow critical (auth, tạo order, v.v.)
- [ ] CI pipeline chạy test trước khi merge

#### Advanced Architecture & Operations

- [ ] Nếu dùng GraphQL: resolver, guard, interceptor, DataLoader, complexity limit được cấu hình rõ
- [ ] Nếu dùng WebSocket: gateway auth, room policy, scale-out strategy với Redis adapter được định nghĩa
- [ ] Nếu dùng microservices: message contract, retry policy, DLQ/poison message strategy được document
- [ ] Metrics, tracing, dashboard, alert rule tối thiểu đã được thiết lập
- [ ] Backup / restore procedure đã được test định kỳ
- [ ] Database indexes, query plan, pool size, compression đã được review
- [ ] Feature flags có owner, expiry date, cleanup plan
- [ ] Migration phức tạp có rollback/roll-forward plan và được test trên staging

---

## 31. GraphQL Standard

### Khi nào dùng

- `MAY` dùng GraphQL khi frontend cần aggregate nhiều resource, giảm overfetch/underfetch, hoặc cần schema contract mạnh.
- `SHOULD NOT` thêm GraphQL chỉ vì “trông hiện đại” nếu REST đã đủ rõ và đơn giản.

### Quy tắc

- `MUST` tách `resolver` khỏi business logic; resolver chỉ map input/output và gọi service/use-case.
- `MUST` dùng DTO/InputType/ObjectType rõ ràng, không expose raw entity/model.
- `MUST` áp dụng auth/roles guard cho GraphQL context tương tự REST.
- `SHOULD` dùng DataLoader để tránh N+1 query.
- `SHOULD` cấu hình query depth/complexity limit để tránh abuse.
- `MAY` dùng federation chỉ khi hệ thống thực sự tách domain/service.

### Cấu trúc gợi ý

```ts
modules/users/
├── users.resolver.ts
├── dto/
├── graphql/
│   ├── user.object-type.ts
│   └── create-user.input.ts
└── loaders/
    └── user-by-id.loader.ts
```

### Bắt buộc khi chạy production

- Batching bằng DataLoader cho relation hay bị lặp.
- Guard đọc user từ GraphQL context, không dùng HTTP request trực tiếp.
- Disable playground/introspection ở production nếu policy yêu cầu.

---

## 32. WebSocket & Realtime

### Quy tắc

- `MUST` đặt gateway trong `infrastructure/ws` hoặc module domain liên quan nếu scope hẹp.
- `MUST` authenticate socket connection trước khi join room.
- `MUST` validate event payload giống HTTP DTO.
- `MUST` define rõ naming cho event, room, ack response.
- `SHOULD` scale bằng Redis adapter nếu chạy nhiều instance.

### Gợi ý tổ chức

```ts
infrastructure/ws/
├── ws.module.ts
├── gateways/
├── adapters/
└── auth/
```

### Room & event rules

- Room format: `{domain}:{entityId}` hoặc `{domain}:{entityId}:{scope}`
- Event format: `domain.action`
- Không nhét business logic nặng trong gateway; gateway chỉ auth, subscribe, publish

---

## 33. Microservices & Message Patterns

### Khi nào dùng

- `MAY` dùng microservices khi domain tách biệt rõ, scale độc lập, hoặc cần queue/message broker.
- `SHOULD NOT` tách microservices quá sớm nếu monolith modular vẫn đáp ứng tốt.

### Quy tắc

- `MUST` version message contract.
- `MUST` define timeout, retry, idempotency cho consumer.
- `MUST` có strategy cho poison message / dead-letter queue.
- `MUST` log correlation id xuyên qua message flow.
- `SHOULD` tách command/event rõ ràng: command kỳ vọng xử lý cụ thể, event là broadcast đã xảy ra.

### Pattern cơ bản

- Command: `payment.process`
- Event: `user.created`
- Query RPC: chỉ dùng khi thật cần; ưu tiên async event/command

---

## 34. Observability nang cao

### Bắt buộc

- `MUST` có logs, metrics, tracing cho production system quan trọng.
- `MUST` gắn `requestId` / `traceId` vào log.
- `SHOULD` dùng OpenTelemetry cho tracing và metrics.

### Metrics tối thiểu

- HTTP request count, latency, error rate
- Queue depth, job success/fail
- DB query duration, cache hit/miss
- Process memory, CPU, event loop lag

### Tracing

- Trace cho HTTP -> service -> repository -> external provider
- Trace cho queue producer/consumer
- Export sang Jaeger, Tempo, Zipkin hoặc vendor APM tương đương

### Alerting & dashboard

- Alert khi error rate, p95 latency, queue backlog, memory tăng bất thường
- Dashboard phải có ít nhất: API overview, DB/cache, jobs, auth endpoints

---

## 35. Security nang cao

### Bổ sung bắt buộc

- `MUST` có brute-force protection cho login, OTP, password reset.
- `MUST` kết hợp rate limit theo IP cho public endpoint và theo userId cho endpoint đã auth.
- `SHOULD` dùng Redis storage cho throttling khi chạy nhiều instance.
- `MAY` bật CSRF protection nếu app dùng cookie-based auth và browser session.

### Gợi ý policy

- Login: limit chặt theo IP + email
- OTP verify: limit theo user/phone/email + cooldown resend
- Admin endpoint: limit riêng và log audit

---

## 36. CI/CD Pipeline

### Quy tắc

- `MUST` chạy lint, type-check, unit test trước khi merge.
- `SHOULD` chạy e2e test cho protected branch hoặc trước deploy production.
- `MUST` block deploy nếu pipeline đỏ.
- `SHOULD` tách pipeline: verify -> build -> migrate -> deploy.

### GitHub Actions tối thiểu

```yaml
name: ci
on: [pull_request, push]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

### Deploy rule

- Production deploy chỉ từ protected branch
- Migration phải chạy theo cơ chế non-interactive
- Có smoke test sau deploy

---

## 37. Disaster Recovery & Backup

### Bắt buộc

- `MUST` có backup policy cho database, Redis quan trọng, file storage metadata.
- `MUST` có restore runbook được viết rõ.
- `SHOULD` test restore định kỳ trên staging hoặc môi trường tách biệt.

### Tối thiểu cần document

- Backup ở đâu
- Tần suất backup
- Thời gian giữ backup
- RPO/RTO mục tiêu
- Người chịu trách nhiệm khôi phục

---

## 38. Performance Tuning

### Database

- `MUST` review index cho các query filter/sort phổ biến.
- `SHOULD` kiểm tra query plan với endpoint chậm.
- `MUST` tránh N+1 query ở REST lẫn GraphQL.

### Application

- `SHOULD` bật compression cho payload lớn nếu phù hợp.
- `SHOULD` theo dõi event loop lag và memory usage.
- `MAY` tune Node.js memory flag khi workload lớn.

### Connection pooling

- Pool size phải phù hợp với DB tier và số instance.
- Không scale app trước khi hiểu connection budget

---

## 39. Feature Flags & AB Testing

### Quy tắc

- `MAY` dùng feature flag cho rollout an toàn, kill switch, hoặc A/B testing.
- `MUST` mỗi flag có owner, mục đích, ngày hết hạn.
- `MUST NOT` để stale flag tồn tại vô thời hạn.
- `SHOULD` kiểm tra cả nhánh on/off trong test cho flow quan trọng.

### Gợi ý

- Flag lưu trong config service, Redis, hoặc provider chuyên dụng
- Tách rõ release flag, ops flag, experiment flag

---

## 40. Data Migration & Prisma Operations

### Quy tắc

- `MUST` phân biệt schema migration và data migration.
- `MUST` test migration trên staging với snapshot gần production nếu migration phức tạp.
- `MUST` có rollback hoặc roll-forward plan trước khi chạy production.
- `SHOULD` viết data migration idempotent nếu có thể.

### Prisma operations

- `prisma migrate deploy` cho production
- `prisma migrate dev` chỉ dùng local/dev
- Seed data cho staging/test phải tách khỏi production seed

### Với migration phức tạp

- Chạy theo nhiều bước: add column -> backfill -> switch read/write -> remove old column
- Không gộp schema breaking change và data backfill nặng vào một bước duy nhất
- Monitor error rate và query latency trong và sau migration

---

*NESTJS-STANDARD.md — Version 2.2*  
*Cập nhật: stack NestJS + Prisma + Redis, deploy Render, frontend Vercel.*
