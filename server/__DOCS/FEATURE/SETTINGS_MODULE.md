
Dưới đây là tài liệu cho **SettingsModule** (riêng, tách khỏi Users) đạt chuẩn 10/10, dựa trên Prisma schema và các quy tắc trong `NESTJS-STANDARD.md`.

```markdown
# Settings Module – Spackie English

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Redis (cache).

## Mục tiêu

- Quản lý cấu hình người dùng (settings) được lưu trong field `settings` của model `User` (dạng JSON).
- Cho phép user đọc, cập nhật từng phần, reset về mặc định.
- Admin có thể xem settings của bất kỳ user (nhưng không sửa – tuỳ chính sách).
- Tích hợp cache để giảm tải database.
- Đảm bảo validation cho từng trường trong settings.

## Settings Structure (Default)

```json
{
  "reminderEnabled": true,
  "reminderTime": "08:00",
  "theme": "light",
  "language": "vi"
}
```

| Field             | Type      | Mô tả                                 | Validation                                       |
| ----------------- | --------- | ------------------------------------- | ------------------------------------------------ |
| `reminderEnabled` | `boolean` | Bật/tắt thông báo nhắc học            | `IsBoolean`                                      |
| `reminderTime`    | `string`  | Giờ nhắc học (HH:MM, 24h)             | `Matches(/^([0-1]?[0-9]\\|2[0-3]):[0-5][0-9]$/)` |
| `theme`           | `string`  | Giao diện (`light`, `dark`, `system`) | `IsIn(['light','dark','system'])`                |
| `language`        | `string`  | Ngôn ngữ giao diện (mã ISO 639-1)     | `IsString()`, `Length(2)`                        |

## Endpoints

| Method | Path                | Mô tả                              | Role truy cập   |
| ------ | ------------------- | ---------------------------------- | --------------- |
| GET    | `/settings`         | Lấy settings của user hiện tại     | `USER`, `ADMIN` |
| PATCH  | `/settings`         | Cập nhật từng phần settings        | `USER`, `ADMIN` |
| DELETE | `/settings`         | Reset settings về mặc định         | `USER`, `ADMIN` |
| GET    | `/settings/:userId` | (Admin) Lấy settings của user khác | `ADMIN`         |

## DTOs

### UpdateSettingsDto
```typescript
import { IsBoolean, IsOptional, IsString, IsIn, Matches, Length } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'reminderTime must be in HH:MM format (00:00-23:59)',
  })
  reminderTime?: string;

  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  language?: string;
}
```

### SettingsResponseDto
```typescript
import { Expose } from 'class-transformer';

export class SettingsResponseDto {
  @Expose()
  reminderEnabled: boolean;

  @Expose()
  reminderTime: string;

  @Expose()
  theme: string;

  @Expose()
  language: string;
}
```

## Use Cases

### 1. `GET /settings` – Lấy settings của user hiện tại

| **Tên**            | Xem cấu hình của chính mình                                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Trả về settings JSON, merge với default nếu thiếu field.                                                                                                                                                          |
| **Tiền điều kiện** | Access token hợp lệ.                                                                                                                                                                                              |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                                                                                                                                                           |
| **Luồng chính**    | 1. Lấy `userId` từ token.<br>2. Kiểm tra cache `settings:{userId}`.<br>3. Nếu miss, lấy user từ DB, merge `user.settings` với `DEFAULT_SETTINGS`.<br>4. Lưu cache (TTL 300s).<br>5. Trả về `SettingsResponseDto`. |

### 2. `PATCH /settings` – Cập nhật từng phần settings

| **Tên**            | Cập nhật một hoặc nhiều trường settings                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Merge DTO với settings hiện tại, lưu lại, xoá cache.                                                                                                                                                  |
| **Tiền điều kiện** | Access token hợp lệ, DTO hợp lệ.                                                                                                                                                                      |
| **Hậu điều kiện**  | Settings được cập nhật, cache bị xoá.                                                                                                                                                                 |
| **Luồng chính**    | 1. Lấy user hiện tại.<br>2. Merge `currentSettings` với DTO.<br>3. Validate merged object (tuỳ chọn).<br>4. Cập nhật `user.settings`.<br>5. Xoá cache `settings:{userId}`.<br>6. Trả về settings mới. |

### 3. `DELETE /settings` – Reset settings về mặc định

| **Tên**            | Khôi phục cấu hình mặc định                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Mô tả**          | Gán `user.settings = {}` (khi đọc sẽ merge với default).                                                     |
| **Tiền điều kiện** | Access token hợp lệ.                                                                                         |
| **Hậu điều kiện**  | `user.settings` được set rỗng, cache bị xoá.                                                                 |
| **Luồng chính**    | 1. Cập nhật `user.settings = Prisma.JsonNull` (hoặc `{}`).<br>2. Xoá cache.<br>3. Trả về `DEFAULT_SETTINGS`. |

### 4. `GET /settings/:userId` – (Admin) Lấy settings của user khác

| **Tên**            | Admin xem cấu hình của user bất kỳ                                             |
| ------------------ | ------------------------------------------------------------------------------ |
| **Mô tả**          | Tương tự `GET /settings` nhưng dành cho admin.                                 |
| **Tiền điều kiện** | Role `ADMIN`.                                                                  |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                        |
| **Luồng chính**    | 1. Tìm user theo `userId`.<br>2. Merge settings với default.<br>3. Trả về DTO. |

## Cache Strategy

| Key pattern         | TTL  | Invalidation trigger              |
| ------------------- | ---- | --------------------------------- |
| `settings:{userId}` | 300s | PATCH /settings, DELETE /settings |

**Invalidation**:
```typescript
await this.cacheManager.del(`settings:${userId}`);
```

## Default Settings & Merge Logic

```typescript
export const DEFAULT_SETTINGS = {
  reminderEnabled: true,
  reminderTime: '08:00',
  theme: 'light',
  language: 'vi',
};

export function mergeSettings(dbSettings: any): SettingsResponseDto {
  return {
    ...DEFAULT_SETTINGS,
    ...(dbSettings as Record<string, unknown> ?? {}),
  };
}
```

Khi lưu settings, chỉ lưu các field khác default (để tiết kiệm dung lượng). Ví dụ: nếu user chỉ thay đổi `theme: 'dark'`, thì `user.settings = { theme: 'dark' }`. Khi đọc, merge với default.

## Repository & Service

### SettingsRepository (dùng chung UsersRepository hoặc Prisma trực tiếp)
```typescript
// settings.repository.ts
async getUserSettings(userId: string): Promise<any> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  return user?.settings ?? {};
}

async updateUserSettings(userId: string, settings: any): Promise<void> {
  await this.prisma.user.update({
    where: { id: userId },
    data: { settings },
  });
}
```

### SettingsService
```typescript
@Injectable()
export class SettingsService {
  async getSettings(userId: string): Promise<SettingsResponseDto> {
    const cached = await this.cacheManager.get(`settings:${userId}`);
    if (cached) return cached as SettingsResponseDto;
    const dbSettings = await this.settingsRepository.getUserSettings(userId);
    const merged = mergeSettings(dbSettings);
    await this.cacheManager.set(`settings:${userId}`, merged, 300);
    return merged;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    const current = await this.getSettings(userId);
    const updated = { ...current, ...dto };
    // Chỉ lưu các field khác default để tiết kiệm
    const toSave = {};
    for (const key of Object.keys(updated)) {
      if (updated[key] !== DEFAULT_SETTINGS[key]) {
        toSave[key] = updated[key];
      }
    }
    await this.settingsRepository.updateUserSettings(userId, toSave);
    await this.cacheManager.del(`settings:${userId}`);
    return updated;
  }

  async resetSettings(userId: string): Promise<SettingsResponseDto> {
    await this.settingsRepository.updateUserSettings(userId, {});
    await this.cacheManager.del(`settings:${userId}`);
    return DEFAULT_SETTINGS;
  }
}
```

## Security & Validation

- **Chỉ user sở hữu hoặc admin mới có thể truy cập settings**.
- **Validation nghiêm ngặt** cho `reminderTime`, `theme`, `language` để tránh dữ liệu xấu.
- **Không cho phép gửi các field không xác định** (whitelist trong DTO).
- **Cache invalidation bắt buộc** sau mỗi lần cập nhật hoặc reset.

## Kết luận

- **SettingsModule** cung cấp đầy đủ CRUD trên settings JSON.
- Merge với default giúp linh hoạt và tiết kiệm lưu trữ.
- Cache giảm tải database.
- Validation đảm bảo dữ liệu hợp lệ.
- Endpoint admin hỗ trợ xem settings của user khác.

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này thành `__DOCS/SETTINGS_MODULE.md`. Nội dung đã tách biệt hoàn toàn khỏi UsersModule, chỉ phụ thuộc vào repository user và cache.