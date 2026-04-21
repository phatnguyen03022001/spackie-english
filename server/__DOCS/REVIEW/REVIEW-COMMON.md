
## File `common.md` phiên bản 10/10

Dưới đây là phiên bản hoàn chỉnh, bổ sung các phần còn thiếu và làm rõ từng utility.

```markdown
# Common Module – Hướng dẫn sử dụng

> Dựa trên `COMMON-RULES.md` và code thực tế trong `src/common/`

## Mục đích

`common/` chứa các thành phần dùng chung (cross-cutting concerns) như guards, interceptors, filters, pipes, decorators, constants, DTO, interfaces, logger, và utils nhỏ. **Không được chứa business logic theo domain cụ thể.**

## Cấu trúc thư mục

```
src/common/
├── dto/                           # Response/Request DTO chuẩn
├── filters/                       # Exception filter toàn cục + AppException
├── interceptors/                  # Logging, transform, cache, idempotency
├── guards/                        # Auth, roles, rate limiting
├── pipes/                         # Validation và parse ObjectId
├── decorators/                    # @Public, @Roles, @CurrentUser, @CacheTTL, @ApiPagination
├── constants/                     # Error codes, app constants
├── interfaces/                    # RequestUser, PaginationMeta, ICacheManager, PaginatedResult
├── logger/                        # LoggerService (dùng pino) + options
└── utils/                         # Helper functions thuần túy (liệt kê đầy đủ bên dưới)
```

## Các thành phần chính

### 1. Response & Request DTO (`dto/`)

| DTO                        | Mô tả                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SuccessResponseDto<T>`    | Envelope cho response thành công: `{ success, data, message?, meta? }`                                |
| `ErrorResponseDto`         | Envelope cho lỗi chuẩn: `{ success, statusCode, error: { code, message, details }, path, timestamp }` |
| `PaginationResponseDto<T>` | Response có phân trang: `{ data, meta: { page, limit, total, totalPages } }`                          |
| `PaginationRequestDto`     | Query params cho phân trang: `page`, `limit`, `sortBy`, `sortOrder` (có validation)                   |

**Sử dụng trong controller:**
```ts
@Get()
async findAll(@Query() query: PaginationRequestDto) {
  const { data, total } = await this.usersService.findAll(query);
  return new PaginationResponseDto(data, total, query.page, query.limit);
}
```

### 2. Exception Filter (`filters/`)

- **`HttpExceptionFilter`** – Bắt tất cả exception, chuẩn hóa thành `ErrorResponseDto`.
- **`AppException`** – Helper để throw exception với error code.

```ts
throw new AppException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'User not found');
```

### 3. Interceptors (`interceptors/`)

| Interceptor              | Chức năng                                                              |
| ------------------------ | ---------------------------------------------------------------------- |
| `TransformInterceptor`   | Wrap response thành `{ success, data, meta, message }`                 |
| `LoggingInterceptor`     | Ghi log request/response với `requestId`, `userId`, `durationMs`       |
| `CacheInterceptor`       | Cache GET requests, chống cache stampede (dùng mutex)                  |
| `IdempotencyInterceptor` | Đảm bảo idempotency cho POST/PUT/PATCH (dùng header `Idempotency-Key`) |

**Sử dụng:**
```ts
@Get(':id')
@CacheTTL(CACHE_TTL.MEDIUM)
async findOne(@Param('id') id: string) { ... }

@Post('orders')
@UseInterceptors(IdempotencyInterceptor)
async createOrder(@Body() dto: CreateOrderDto) { ... }
```

### 4. Guards (`guards/`)

| Guard                  | Chức năng                                                      |
| ---------------------- | -------------------------------------------------------------- |
| `JwtAuthGuard`         | Xác thực JWT, bỏ qua nếu dùng `@Public()`                      |
| `RolesGuard`           | Kiểm tra role (dùng `@Roles('admin')`)                         |
| `CustomThrottlerGuard` | Rate limiting, lấy IP thật từ `x-forwarded-for` (hỗ trợ proxy) |

### 5. Pipes (`pipes/`)

- **`GlobalValidationPipe`** – Áp dụng toàn app với `whitelist: true`, `forbidNonWhitelisted: true`.
- **`ParseObjectIdPipe`** – Chuyển string thành MongoDB ObjectId, ném lỗi `INVALID_OBJECT_ID`.

### 6. Decorators (`decorators/`)

| Decorator             | Mô tả                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| `@Public()`           | Bỏ qua JWT auth cho endpoint                                                 |
| `@Roles(...roles)`    | Yêu cầu role tối thiểu                                                       |
| `@CurrentUser(prop?)` | Lấy user từ request (hoặc một field)                                         |
| `@CacheTTL(seconds)`  | Override TTL cho cache interceptor                                           |
| `@ApiPagination()`    | Tự động thêm Swagger query params cho `page`, `limit`, `sortBy`, `sortOrder` |

### 7. Constants (`constants/`)

- **`ERROR_CODES`** – Tất cả error codes theo chuẩn `DOMAIN_ACTION_REASON` (vd: `USER_NOT_FOUND`, `AUTH_INVALID_TOKEN`).
- **`APP_CONSTANTS`** – Pagination defaults, upload limits, JWT expiry, v.v.

### 8. Utils – danh sách đầy đủ

Tất cả các hàm dưới đây đều thuần túy, không có side effect.

| File                 | Các hàm chính                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pagination.util.ts` | `buildPaginationMeta`, `parseSortQuery`, `getPaginationOffset`, `createPaginationResponse`, `validatePaginationParams` |
| `cache.util.ts`      | `CacheKeyBuilder.resource()`, `.list()`, `.search()`, `.userResource()`, `.listPattern()`; `CACHE_TTL` constants       |
| `crypto.util.ts`     | `hashPassword`, `comparePassword`, `generateRandomToken`                                                               |
| `string.util.ts`     | `capitalize`, `truncate`, `slugify`                                                                                    |
| `number.util.ts`     | `clamp`, `roundTo`, `randomInt`                                                                                        |
| `date.util.ts`       | `formatDate`, `formatDateTime`, `isExpired`                                                                            |
| `array.util.ts`      | `chunk`, `uniqueByKey`                                                                                                 |
| `object.util.ts`     | `pick`, `omit`                                                                                                         |
| `file.util.ts`       | `getFileExtension`, `isImageMimeType`, `formatFileSize`                                                                |
| `serialize.util.ts`  | `safeSerialize` – dùng trong logger, tránh circular reference, giới hạn độ sâu & kích thước                            |
| `async.util.ts`      | `delay`, `retry`                                                                                                       |

**Sử dụng utils trong service:**
```ts
import { buildPaginationMeta, parseSortQuery, retry } from '@common/utils';

const { field, order } = parseSortQuery(sort);
const meta = buildPaginationMeta(total, page, limit);
const result = await retry(() => someUnstableCall(), 3, 1000);
```

### 9. Logger (`logger/`)

- **`LoggerService`** – Wrapper cho pino, hỗ trợ structured logging, tự động redact sensitive fields.
- Tích hợp OpenTelemetry – Tự động gắn `trace_id`, `span_id` vào log.
- Dùng trong service:
```ts
constructor(private readonly logger: LoggerService) {
  this.logger.setContext(UsersService.username);
}
this.logger.info({ userId, action: 'findOne' }, 'Fetching user');
```

### 10. Interfaces (`interfaces/`)

- **`RequestUser`** – Shape của user object gắn vào request sau JWT guard.
- **`ICacheManager`** – Contract cho cache adapter: `get`, `set`, `del`, `delPattern`, `reset`, `ping`.
- **`PaginationMeta`** & **`PaginatedResult<T>`** – Types cho phân trang.

## Quy tắc sử dụng

### ✅ Nên làm
- Dùng `SuccessResponseDto` hoặc để `TransformInterceptor` tự wrap.
- Dùng `AppException` để throw lỗi có error code.
- Dùng `@Public()` cho các endpoint login, register, health.
- Dùng `@Roles()` cho endpoint yêu cầu quyền.
- Dùng `@CacheTTL()` cho GET endpoint có thể cache.
- Dùng `IdempotencyInterceptor` cho các POST/PUT/PATCH quan trọng (tạo order, thanh toán).
- Dùng các utils thay vì viết lại logic.

### ❌ Không nên
- Đặt business logic domain (ví dụ `calculateOrderTotal`) vào `common/utils`.
- Gọi DB, Redis, hoặc external service trong utils.
- Dùng `any` – thay bằng `unknown` và type guard.
- Tạo thêm file trong `common/` nếu chỉ dùng bởi một module.

## Ví dụ tổng hợp trong controller

```ts
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiPagination()
  @CacheTTL(CACHE_TTL.LIST)
  async findAll(@Query() query: PaginationRequestDto) {
    const result = await this.usersService.findAll(query);
    return new PaginationResponseDto(result.data, result.total, query.page, query.limit);
  }

  @Post()
  @Roles(RoleEnum.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return new SuccessResponseDto(user, 'User created');
  }

  @Get('me')
  @Public()
  getProfile(@CurrentUser() user: RequestUser) {
    return new SuccessResponseDto(user);
  }
}
```

## Testing cho `common/`

- Unit test bắt buộc cho `CacheInterceptor`, `IdempotencyInterceptor`, `CustomThrottlerGuard`.
- Unit test cho các utils phức tạp (ví dụ `safeSerialize`, `retry`).
- Các utils quá nhỏ (ví dụ `capitalize`) có thể test gián tiếp qua e2e.

---

**Tổng kết:** `common/` cung cấp đầy đủ các thành phần để xây dựng module mới một cách nhất quán, an toàn và dễ bảo trì. Tuân thủ các quy tắc trong `COMMON-RULES.md` để giữ cho thư mục này không bị “rác” và luôn tái sử dụng được.
```

---

File trên đã bổ sung:
- `PaginationRequestDto`
- Danh sách đầy đủ 11 utils files (thêm `array.util.ts`, `number.util.ts`, `object.util.ts`, `file.util.ts`, `serialize.util.ts`)
- `PaginatedResult<T>` interface
- Bảng chi tiết các hàm trong từng util file

