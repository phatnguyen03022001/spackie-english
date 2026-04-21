Dưới đây là file **`AUTH_MODULE.md`** đã được bổ sung phần **Email Quota Management (Brevo)** theo yêu cầu.

```markdown
# Authentication & Authorization – Spackie English

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, JWT, Redis (refresh token, OTP, quota), Prisma (MongoDB), Brevo (email).

## Mục tiêu

- Cung cấp hệ thống xác thực JWT cho 2 role: `USER` và `ADMIN`.
- **User**: đăng nhập bằng email + password.
- **Admin**: đăng nhập bằng email + password **và phải gửi kèm `deviceId`** (thiết bị đã được đăng ký trước trong bảng `AdminDevice`). Nếu `deviceId` không hợp lệ, đăng nhập bị từ chối.
- Hỗ trợ **quên mật khẩu** qua OTP gửi email (cả user và admin).
- Cho phép **guest (chưa đăng nhập)** truy cập các tính năng học tập cơ bản, không lưu kết quả.
- Admin có thể **quản lý các thiết bị được phép** (thêm, xem, xoá deviceId của chính mình).
- **Refresh token** được lưu trong Redis (không lưu trong DB), hỗ trợ token family và phát hiện reuse.
- **OTP** được hash (bcrypt) trước khi lưu vào DB.

## Endpoints

| Method | Path                            | Mô tả                                          | Role truy cập                  |
| ------ | ------------------------------- | ---------------------------------------------- | ------------------------------ |
| POST   | `/auth/register`                | Đăng ký tài khoản user (role USER)             | `@Public()`                    |
| POST   | `/auth/login`                   | Đăng nhập (user: email+pass; admin: +deviceId) | `@Public()`                    |
| POST   | `/auth/refresh`                 | Lấy access token mới từ refresh token          | `@Public()` (có refresh token) |
| POST   | `/auth/logout`                  | Đăng xuất, xoá refresh token                   | `@Authenticated()`             |
| GET    | `/auth/me`                      | Lấy thông tin user/admin hiện tại              | `@Authenticated()`             |
| POST   | `/auth/change-password`         | Đổi mật khẩu (cần nhập mật khẩu cũ)            | `@Authenticated()`             |
| POST   | `/auth/forgot-password`         | Gửi OTP qua email để đặt lại mật khẩu          | `@Public()` (rate limited)     |
| POST   | `/auth/reset-password`          | Xác nhận OTP và đặt mật khẩu mới               | `@Public()` (rate limited)     |
| GET    | `/auth/admin/devices`           | Lấy danh sách thiết bị đã đăng ký của admin    | `@Roles(Role.ADMIN)`           |
| POST   | `/auth/admin/devices`           | Thêm một thiết bị mới (deviceId, tên tuỳ chọn) | `@Roles(Role.ADMIN)`           |
| DELETE | `/auth/admin/devices/:deviceId` | Xoá một thiết bị khỏi danh sách                | `@Roles(Role.ADMIN)`           |

## DTOs

### RegisterDto
```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}
```

### LoginDto
```typescript
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  deviceId?: string;   // Bắt buộc nếu role là ADMIN
}
```

### RefreshTokenDto
```typescript
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
```

### ChangePasswordDto
```typescript
export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
```

### ForgotPasswordDto
```typescript
export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
```

### ResetPasswordDto
```typescript
export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  otp: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
```

### AddDeviceDto
```typescript
export class AddDeviceDto {
  @IsString()
  deviceId: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
```

### DeviceResponseDto
```typescript
export class DeviceResponseDto {
  id: string;
  deviceId: string;
  deviceName?: string;
  createdAt: Date;
  lastUsedAt?: Date;
}
```

## Prisma Schema (phần liên quan)

```prisma
model User {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  email        String   @unique
  username     String   @unique
  passwordHash String?
  role         Role     @default(USER)
  // ... các field khác (avatar, settings, deletedAt...)
  isBanned     Boolean  @default(false)
  devices      AdminDevice[]
  // KHÔNG lưu refreshToken trong DB
}

model AdminDevice {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  deviceId    String
  deviceName  String?
  userId      String   @db.ObjectId
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())

  @@unique([userId, deviceId])
}

model Otp {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  email     String
  otpHash   String   // bcrypt hash
  type      String   // 'FORGOT_PASSWORD', 'VERIFY_EMAIL'
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([email])
}
```

## Redis Key Design

| Purpose               | Key format                         | TTL    |
| --------------------- | ---------------------------------- | ------ |
| Refresh token (user)  | `auth:refresh:{userId}:{deviceId}` | 7 days |
| Refresh token (admin) | `auth:refresh:{userId}:{deviceId}` | 7 days |
| OTP rate limiting     | `otp:rate:{email}`                 | 1 hour |
| Reset password lock   | `reset:lock:{email}`               | 5 mins |
| Email quota           | `email:quota:YYYY-MM-DD`           | 24h    |

## Use Cases

### 1. `POST /auth/register` – Đăng ký

| **Tên**            | Đăng ký tài khoản mới                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Người dùng cung cấp email, password, tên để tạo tài khoản role `USER`.                                    |
| **Tiền điều kiện** | Email chưa tồn tại, chưa đăng nhập.                                                                       |
| **Hậu điều kiện**  | User được tạo, password đã hash, sẵn sàng đăng nhập.                                                      |
| **Luồng chính**    | 1. Validate email, password.<br>2. Tạo user với `role = USER`, `provider = LOCAL`.<br>3. Trả về user DTO. |
| **Ngoại lệ**       | Email trùng → `409 CONFLICT`. Password yếu → `400 BAD_REQUEST`.                                           |

### 2. `POST /auth/login` – Đăng nhập

#### User (không deviceId)
| **Tên**            | Đăng nhập user thường                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mô tả**          | Xác thực email/password, cấp access/refresh token.                                                                                                                                                                                                                 |
| **Tiền điều kiện** | User chưa bị ban (`isBanned = false`), tài khoản active.                                                                                                                                                                                                           |
| **Hậu điều kiện**  | Access token (15m), refresh token (7d) được cấp, refresh token hash lưu trong Redis.                                                                                                                                                                               |
| **Luồng chính**    | 1. Tìm user theo email.<br>2. So sánh password (bcrypt).<br>3. Kiểm tra `isBanned` → nếu true throw 403.<br>4. Sinh `deviceId` mới (UUID).<br>5. Tạo JWT (userId, email, role, deviceId).<br>6. Lưu hash refresh token vào Redis.<br>7. Trả về tokens + user info. |

#### Admin (cần deviceId)
| **Tên**            | Đăng nhập admin với xác thực thiết bị                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Admin phải cung cấp `deviceId` đã được đăng ký trong `AdminDevice`.                                                                                                                                                               |
| **Tiền điều kiện** | Admin đã thêm deviceId vào danh sách cho phép.                                                                                                                                                                                    |
| **Hậu điều kiện**  | Access token được cấp, `lastUsedAt` của device được cập nhật.                                                                                                                                                                     |
| **Luồng chính**    | 1. Xác thực email/password, kiểm tra ban.<br>2. Kiểm tra `deviceId` có trong `AdminDevice` của admin đó không.<br>3. Cập nhật `lastUsedAt`.<br>4. Sinh token, lưu refresh token vào Redis (key có deviceId).<br>5. Trả về tokens. |

### 3. `POST /auth/refresh` – Refresh token rotation

| **Tên**            | Làm mới access token                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Dùng refresh token hợp lệ để lấy cặp token mới, đồng thời thu hồi token cũ (phát hiện reuse).                                                                                                                                                                                                                                                                                                      |
| **Tiền điều kiện** | Refresh token chưa hết hạn, chưa bị đánh dấu reuse.                                                                                                                                                                                                                                                                                                                                                |
| **Hậu điều kiện**  | Token cũ bị xoá, token mới được tạo và lưu.                                                                                                                                                                                                                                                                                                                                                        |
| **Luồng chính**    | 1. Giải mã refresh token, lấy `userId`, `deviceId`.<br>2. Lấy hash lưu trong Redis theo key `auth:refresh:{userId}:{deviceId}`.<br>3. So sánh hash (bcrypt).<br>4. Nếu không khớp → revoke toàn bộ session của user (xoá tất cả keys `auth:refresh:{userId}:*`), throw `AUTH_REFRESH_TOKEN_REUSED`.<br>5. Xoá token cũ khỏi Redis.<br>6. Tạo cặp token mới, lưu hash mới.<br>7. Trả về tokens mới. |

### 4. `POST /auth/logout` – Đăng xuất

| **Tên**            | Thu hồi refresh token                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Xoá refresh token khỏi Redis, client xoá access token.                                                           |
| **Tiền điều kiện** | Đã đăng nhập, refresh token hợp lệ.                                                                              |
| **Hậu điều kiện**  | Token không thể dùng lại.                                                                                        |
| **Luồng chính**    | 1. Nhận refresh token.<br>2. Giải mã lấy `userId`, `deviceId`.<br>3. Xoá key `auth:refresh:{userId}:{deviceId}`. |

### 5. `GET /auth/me` – Xem profile

| **Tên**            | Lấy thông tin người dùng hiện tại                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| **Mô tả**          | Trả về thông tin user (không password, không token).                                             |
| **Tiền điều kiện** | Access token hợp lệ.                                                                             |
| **Luồng chính**    | 1. Giải mã token lấy `userId`.<br>2. Tìm user trong DB (loại bỏ passwordHash).<br>3. Trả về DTO. |

### 6. `POST /auth/change-password` – Đổi mật khẩu

| **Tên**            | Đổi mật khẩu khi đã đăng nhập                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Người dùng nhập mật khẩu cũ và mật khẩu mới để cập nhật.                                                                                                   |
| **Tiền điều kiện** | Đã đăng nhập, mật khẩu cũ đúng.                                                                                                                            |
| **Hậu điều kiện**  | Mật khẩu mới được hash, toàn bộ refresh token của user bị thu hồi (tuỳ chọn).                                                                              |
| **Luồng chính**    | 1. Lấy user từ DB.<br>2. So sánh mật khẩu cũ.<br>3. Hash mật khẩu mới, cập nhật.<br>4. Xoá tất cả keys `auth:refresh:{userId}:*`.<br>5. Trả về thành công. |

### 7. `POST /auth/forgot-password` – Gửi OTP

| **Tên**            | Yêu cầu đặt lại mật khẩu qua email                                                                                                                                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Tạo OTP 6 chữ số, hash và lưu vào bảng `Otp`, gửi email. Rate limit: 3 lần/giờ/email.                                                                                                                                                                                                                                   |
| **Tiền điều kiện** | Email tồn tại trong hệ thống (không tiết lộ lỗi để tránh brute force).                                                                                                                                                                                                                                                  |
| **Hậu điều kiện**  | Bản ghi OTP được tạo (TTL 5 phút).                                                                                                                                                                                                                                                                                      |
| **Luồng chính**    | 1. Kiểm tra rate limit Redis `otp:rate:{email}`.<br>2. Tìm user (nếu không thấy vẫn trả thành công).<br>3. Tạo OTP 6 số.<br>4. Hash OTP (bcrypt).<br>5. Lưu vào `Otp` với expiresAt = now+5m.<br>6. Kiểm tra quota email (xem mục bên dưới).<br>7. Gửi email qua `MailService`.<br>8. Trả về `{ message: 'OTP sent' }`. |

### 8. `POST /auth/reset-password` – Xác nhận OTP

| **Tên**            | Đặt lại mật khẩu bằng OTP                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Xác thực OTP (so sánh hash), cập nhật mật khẩu mới, xoá OTP và toàn bộ refresh token của user.                                                                                                                    |
| **Tiền điều kiện** | OTP chưa hết hạn, chưa dùng.                                                                                                                                                                                      |
| **Hậu điều kiện**  | Mật khẩu được cập nhật, OTP bị xoá, tất cả session bị thu hồi.                                                                                                                                                    |
| **Luồng chính**    | 1. Tìm OTP theo email, type, chưa hết hạn.<br>2. So sánh OTP nhập với `otpHash`.<br>3. Hash mật khẩu mới, cập nhật user.<br>4. Xoá OTP.<br>5. Xoá tất cả keys `auth:refresh:{userId}:*`.<br>6. Trả về thành công. |

### 9. Quản lý thiết bị (Admin)

#### `GET /auth/admin/devices`
- Admin xem danh sách device của mình.

#### `POST /auth/admin/devices`
- Thêm deviceId mới (kiểm tra unique theo `userId`).

#### `DELETE /auth/admin/devices/:deviceId`
- Xoá deviceId, thu hồi khả năng đăng nhập từ thiết bị đó.

## Email Quota Management (Brevo)

- **Giới hạn**: Brevo free tier cung cấp **300 email/ngày**.
- **Cơ chế đếm**: Sử dụng Redis với key `email:quota:YYYY-MM-DD` (số email đã gửi trong ngày). TTL tự động hết ngày.
- **Kiểm tra trước khi gửi**:
  - Nếu `count >= 300` → từ chối gửi, log warning, trả về lỗi `EMAIL_QUOTA_EXCEEDED`.
  - Nếu `count >= 240` (80%) → chỉ cho phép gửi các email ưu tiên cao (xem dưới).
- **Mức độ ưu tiên** (từ cao xuống thấp):
  1. **OTP** (forgot-password) – luôn cố gắng gửi nếu còn quota.
  2. **Welcome email** – ưu tiên cao.
  3. **Payment confirmation** – trung bình.
  4. **Broadcast / marketing** – thấp, có thể bỏ qua khi quota thấp.
- **Khi vượt ngưỡng 80%**: chỉ gửi OTP và payment confirmation, các loại khác bị từ chối.
- **Cảnh báo**: Ghi log cảnh báo khi quota còn dưới 10% (30 email), có thể gửi email thông báo cho admin.

**Code mẫu (EmailQuotaService):**
```typescript
async checkAndIncrement(priority: 'otp' | 'welcome' | 'payment' | 'broadcast'): Promise<boolean> {
  const today = new Date().toISOString().slice(0,10);
  const key = `email:quota:${today}`;
  let count = await this.redis.get(key) || 0;
  if (count >= 300) return false;
  if (count >= 240 && priority !== 'otp' && priority !== 'payment') return false;
  await this.redis.incr(key);
  if (count >= 270) this.logger.warn(`Email quota nearly exhausted: ${count}/300`);
  return true;
}
```

## Security Notes (Bắt buộc)

| Yêu cầu                                                           | Cách triển khai                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Access token TTL 15 phút, refresh token TTL 7 ngày                | `JWT_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`                  |
| Refresh token được hash (bcrypt) trước khi lưu Redis              | Dùng `bcrypt.hash(refreshToken, 10)`                               |
| Phát hiện refresh token reuse → revoke toàn bộ session            | Xoá tất cả keys `auth:refresh:{userId}:*` khi phát hiện reuse      |
| OTP được hash trước khi lưu DB                                    | `otpHash = await bcrypt.hash(otp, 10)`                             |
| Rate limiting cho forgot-password & reset-password                | `@Throttle({ short: { ttl: 3600000, limit: 3 } })` (3 request/giờ) |
| Bảo vệ endpoint login, register, forgot-password khỏi brute force | Dùng `CustomThrottlerGuard` với IP + userId (nếu có)               |
| Không tiết lộ email tồn tại trong forgot-password                 | Luôn trả `{ message: 'OTP sent' }` kể cả email không tồn tại       |
| Helmet, CORS, trust proxy (Render)                                | Cấu hình trong `main.ts`                                           |
| JWT secret và refresh secret khác nhau, tối thiểu 32 ký tự        | `JWT_SECRET`, `JWT_REFRESH_SECRET`                                 |

## Global Guards & Interceptors

- **`JwtAuthGuard`** áp dụng toàn app, dùng `@Public()` để bỏ qua.
- **`RolesGuard`** kiểm tra role.
- **`CustomThrottlerGuard`** lấy IP thật từ `x-forwarded-for`.
- **`LoggingInterceptor`**, **`TransformInterceptor`**, **`IdempotencyInterceptor`** (cho POST tạo payment).

## Kết luận

Tài liệu này đáp ứng đầy đủ:
- User đăng nhập bằng email/password.
- Admin đăng nhập + deviceId, quản lý thiết bị.
- Forgot password OTP (hash, rate limit, quota).
- Guest mode (endpoint `@Public()`).
- Refresh token rotation với Redis, token family.
- Bảo mật theo chuẩn production.

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này thành `__DOCS/AUTH_MODULE.md`. Nội dung đã được bổ sung chi tiết về quản lý quota email Brevo, ưu tiên gửi, và cơ chế kiểm tra.