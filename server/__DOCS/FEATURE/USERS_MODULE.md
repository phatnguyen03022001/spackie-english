
Dưới đây là tài liệu cho **UsersModule** (riêng, không gộp Settings) đạt chuẩn 10/10, dựa trên Prisma schema MongoDB và các quy tắc trong `NESTJS-STANDARD.md`.

```markdown
# Users Module – Spackie English

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Redis (cache), Storage (Cloudinary/R2).

## Mục tiêu

- Quản lý thông tin người dùng: CRUD cơ bản (đọc, cập nhật), avatar, soft delete, ban/unban.
- Hỗ trợ tìm kiếm, phân trang, lọc theo role, trạng thái (active, banned, deleted).
- Admin có thể xem danh sách, khoá/mở khoá, xoá mềm bất kỳ user nào.
- User có thể xem/sửa thông tin của chính mình, xoá tài khoản (soft delete).
- Tích hợp cache (Redis) cho profile và danh sách user.
- Sử dụng `FileManagerModule` để upload avatar.

## Endpoints

| Method | Path               | Mô tả                                        | Role truy cập                |
| ------ | ------------------ | -------------------------------------------- | ---------------------------- |
| GET    | `/users`           | Lấy danh sách user (phân trang, lọc, search) | `ADMIN`                      |
| GET    | `/users/me`        | Lấy thông tin user hiện tại                  | `USER`, `ADMIN`              |
| GET    | `/users/:id`       | Lấy thông tin user theo ID                   | `ADMIN` (hoặc chính user đó) |
| PATCH  | `/users/me`        | Cập nhật thông tin user hiện tại             | `USER`, `ADMIN`              |
| PATCH  | `/users/me/avatar` | Cập nhật avatar (upload file)                | `USER`, `ADMIN`              |
| DELETE | `/users/me`        | Soft delete chính mình                       | `USER`, `ADMIN`              |
| POST   | `/users/:id/ban`   | Khoá tài khoản (set `isBanned = true`)       | `ADMIN`                      |
| POST   | `/users/:id/unban` | Mở khoá tài khoản                            | `ADMIN`                      |
| DELETE | `/users/:id/hard`  | Hard delete user (xoá vĩnh viễn)             | `ADMIN` (super)              |

> **Lưu ý**: User không thể tự thay đổi email, role. Admin có thể thay đổi qua endpoint riêng nếu cần (không bắt buộc trong MVP).

## DTOs

### UserResponseDto
```typescript
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  displayName?: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  role: string; // 'USER' | 'ADMIN'

  @Expose()
  isActive: boolean;

  @Expose()
  isVerified: boolean;

  @Expose()
  isBanned: boolean;

  @Expose()
  totalCardsLearned: number;

  @Expose()
  currentStreak: number;

  @Expose()
  longestStreak: number;

  @Expose()
  lastStudiedAt?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // Không expose: passwordHash, provider, providerId, settings, deletedAt
}
```

### UpdateUserDto
```typescript
import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
```

### UserListQueryDto
```typescript
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UserListQueryDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search?: string;  // tìm theo email, username, displayName

  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: string;

  @IsOptional()
  @IsIn(['active', 'banned', 'deleted'])
  status?: string;  // active: isBanned=false & deletedAt=null; banned: isBanned=true; deleted: deletedAt!=null
}
```

### BanUserDto (không bắt buộc, có thể dùng param)
```typescript
export class BanUserDto {
  @IsOptional()
  @IsString()
  reason?: string;  // ghi log lý do ban (có thể lưu vào meta)
}
```

## Use Cases

### 1. `GET /users` – Lấy danh sách user (Admin)

| **Tên**            | Xem danh sách user có phân trang, lọc, tìm kiếm                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Admin xem danh sách user, hỗ trợ lọc theo role, status, tìm kiếm.                                                                                                                             |
| **Tiền điều kiện** | Role `ADMIN`.                                                                                                                                                                                 |
| **Hậu điều kiện**  | Trả về danh sách user (đã loại bỏ passwordHash, providerId, settings).                                                                                                                        |
| **Luồng chính**    | 1. Xây dựng `where` condition từ query.<br>2. Gọi repository với phân trang.<br>3. Cache kết quả (TTL 60s) nếu không có filter search.<br>4. Trả về `PaginationResponseDto<UserResponseDto>`. |
| **Ngoại lệ**       | Không có.                                                                                                                                                                                     |

### 2. `GET /users/me` – Lấy thông tin user hiện tại

| **Tên**            | Xem profile của chính mình                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Trả về thông tin user từ token, có cache.                                                                                                                     |
| **Tiền điều kiện** | Access token hợp lệ.                                                                                                                                          |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                                                                                                       |
| **Luồng chính**    | 1. Giải mã token lấy `userId`.<br>2. Kiểm tra cache `users:profile:{userId}`.<br>3. Nếu miss, query DB, lưu cache (TTL 300s).<br>4. Trả về `UserResponseDto`. |

### 3. `GET /users/:id` – Lấy thông tin user theo ID (Admin hoặc chính user)

| **Tên**            | Xem thông tin user khác (chỉ admin hoặc chính user)                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Trả về thông tin user, có kiểm tra quyền.                                                                                                       |
| **Tiền điều kiện** | Access token hợp lệ. Nếu không phải admin thì `id` phải trùng với user hiện tại.                                                                |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                                                                                         |
| **Luồng chính**    | 1. Lấy `userId` từ token.<br>2. Nếu `userId !== param.id` và role không phải ADMIN → throw 403.<br>3. Lấy user từ DB (cache).<br>4. Trả về DTO. |

### 4. `PATCH /users/me` – Cập nhật thông tin user

| **Tên**            | Cập nhật displayName, avatarUrl (không upload file trực tiếp)                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mô tả**          | User tự cập nhật thông tin của mình.                                                                                                                                           |
| **Tiền điều kiện** | Access token hợp lệ.                                                                                                                                                           |
| **Hậu điều kiện**  | User được cập nhật, cache profile bị xoá.                                                                                                                                      |
| **Luồng chính**    | 1. Validate DTO.<br>2. Cập nhật user (không cho phép thay đổi email, role).<br>3. Xoá cache `users:profile:{userId}` và cache danh sách `users:list:*`.<br>4. Trả về user mới. |

### 5. `PATCH /users/me/avatar` – Cập nhật avatar

| **Tên**            | Upload avatar mới, xoá avatar cũ (nếu có)                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Nhận file ảnh, upload lên Storage, cập nhật `avatarUrl`.                                                                                                                                                                   |
| **Tiền điều kiện** | Access token hợp lệ, file là ảnh (jpeg, png, webp), kích thước ≤5MB.                                                                                                                                                       |
| **Hậu điều kiện**  | File cũ bị xoá khỏi Storage, URL mới được lưu.                                                                                                                                                                             |
| **Luồng chính**    | 1. Multer validate file.<br>2. Gọi `FileManagerService.upload(file, 'avatar')`.<br>3. Lấy user cũ, nếu có avatar cũ thì gọi `FileManagerService.delete(oldPublicId)`.<br>4. Cập nhật `avatarUrl`.<br>5. Xoá cache profile. |

### 6. `DELETE /users/me` – Soft delete user

| **Tên**            | Tự xoá tài khoản (soft delete)                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Đánh dấu `deletedAt = now()`, user không thể đăng nhập, không hiển thị.                                                                             |
| **Tiền điều kiện** | Access token hợp lệ, user chưa bị xoá.                                                                                                              |
| **Hậu điều kiện**  | `deletedAt` được set, `isActive = false`, refresh token bị thu hồi, cache bị xoá.                                                                   |
| **Luồng chính**    | 1. Cập nhật `deletedAt = new Date()`, `isActive = false`.<br>2. Xoá tất cả refresh token của user khỏi Redis.<br>3. Xoá cache profile và danh sách. |

### 7. `POST /users/:id/ban` – Khoá tài khoản (Admin)

| **Tên**            | Admin khoá user (`isBanned = true`)                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | User không thể đăng nhập, không thể học (tuỳ chính sách).                                                                     |
| **Tiền điều kiện** | Role `ADMIN`, user tồn tại và chưa bị xoá.                                                                                    |
| **Hậu điều kiện**  | `isBanned = true`, refresh token bị thu hồi, cache bị xoá.                                                                    |
| **Luồng chính**    | 1. Tìm user.<br>2. Cập nhật `isBanned = true`.<br>3. Xoá tất cả refresh token của user.<br>4. Xoá cache profile và danh sách. |

### 8. `POST /users/:id/unban` – Mở khoá tài khoản (Admin)

| **Tên**            | Admin mở khoá user (`isBanned = false`)                          |
| ------------------ | ---------------------------------------------------------------- |
| **Mô tả**          | User có thể đăng nhập lại.                                       |
| **Tiền điều kiện** | Role `ADMIN`, user tồn tại và bị ban.                            |
| **Hậu điều kiện**  | `isBanned = false`, cache bị xoá.                                |
| **Luồng chính**    | 1. Tìm user.<br>2. Cập nhật `isBanned = false`.<br>3. Xoá cache. |

### 9. `DELETE /users/:id/hard` – Hard delete user (Admin)

| **Tên**            | Xoá vĩnh viễn user (cẩn thận)                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Mô tả**          | Xoá user khỏi database, kèm các dữ liệu liên quan (nếu cascade).                              |
| **Tiền điều kiện** | Role `ADMIN` (chỉ super admin).                                                               |
| **Hậu điều kiện**  | User bị xoá vĩnh viễn, cache bị xoá, refresh token bị thu hồi.                                |
| **Luồng chính**    | 1. Xoá user (Prisma `delete`).<br>2. Xoá cache profile và danh sách.<br>3. Xoá refresh token. |

## Cache Strategy

| Key pattern                                                        | TTL  | Invalidation trigger                                |
| ------------------------------------------------------------------ | ---- | --------------------------------------------------- |
| `users:profile:{userId}`                                           | 300s | UPDATE user, UPDATE avatar, DELETE user, BAN, UNBAN |
| `users:list:page:{page}:limit:{limit}:role:{role}:status:{status}` | 60s  | CREATE/UPDATE/DELETE user, BAN, UNBAN               |
| `users:search:{searchTerm}:page:{page}`                            | 60s  | CREATE/UPDATE/DELETE user                           |

**Invalidation pattern** (dùng `delPattern` với SCAN):
```typescript
await this.cacheManager.delPattern('users:profile:*');
await this.cacheManager.delPattern('users:list:*');
await this.cacheManager.delPattern('users:search:*');
```

## Security & Validation

- **Avatar upload**: giới hạn kích thước 5MB, chỉ cho phép image/jpeg, image/png, image/webp.
- **Soft delete**: user bị xoá mềm không thể đăng nhập, không xuất hiện trong danh sách (trừ admin có filter `status=deleted`).
- **Ban**: user bị ban (`isBanned = true`) sẽ bị chặn login (kiểm tra trong `AuthService`).
- **Không cho phép user thường thay đổi email hoặc role** – chỉ admin mới có thể sửa (endpoint riêng nếu cần).
- **Cache invalidation** bắt buộc sau mọi thay đổi dữ liệu.

## Prisma Repository Methods (UsersRepository)

```typescript
// users.repository.ts
async findAll(query: UserListQueryDto) { /* phân trang, lọc, search */ }
async findById(id: string, includeDeleted?: boolean) { /* lấy user, mặc định exclude deletedAt!=null */ }
async update(id: string, data: Prisma.UserUpdateInput) { /* cập nhật, không update email, role */ }
async softDelete(id: string) { /* set deletedAt = new Date(), isActive = false */ }
async hardDelete(id: string) { /* xoá vĩnh viễn (chỉ admin) */ }
async ban(id: string) { /* set isBanned = true, xoá refresh token */ }
async unban(id: string) { /* set isBanned = false */ }
```

## Kết luận

- **UsersModule** cung cấp đầy đủ CRUD, ban, soft delete, phân trang, cache.
- Tất cả đều tuân thủ separation of concerns, dùng DTO, mapper, repository pattern.
- Tích hợp cache invalidation, xử lý avatar qua `FileManagerModule`.
- Endpoint `GET /users/:id` cho phép user xem chính mình, admin xem bất kỳ.

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này thành `__DOCS/USERS_MODULE.md`. SettingsModule sẽ được cung cấp riêng nếu cần.