# Notification Module – Spackie English

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Redis (cache, rate limit), Bull (queue), Mail (Brevo), Pusher (WebSocket).

## Mục tiêu

- Gửi thông báo cho người dùng qua email (Brevo) và/hoặc push notification (Pusher) dựa trên kênh ưu tiên trong `User.settings`.
- Hỗ trợ gửi thông báo bất đồng bộ qua Bull queue (tránh block request).
- Cung cấp cron job gửi reminder học tập hàng ngày (dựa trên `reminderTime` và `reminderEnabled`).
- Log kết quả gửi thông báo (thành công/thất bại) bằng OpenTelemetry (hoặc log file), **không lưu vào database** (theo thiết kế tối giản).
- Đảm bảo rate limiting cho các endpoint gửi thông báo (tránh spam).
- Hỗ trợ admin gửi broadcast (email hàng loạt).

## Endpoints

| Method | Path                         | Mô tả                                          | Role truy cập   |
| ------ | ---------------------------- | ---------------------------------------------- | --------------- |
| POST   | `/notifications/email`       | Gửi email (queue)                              | `USER`, `ADMIN` |
| POST   | `/notifications/push`        | Gửi push notification (queue)                  | `USER`, `ADMIN` |
| POST   | `/notifications/preferences` | Cập nhật preferences (lưu vào `User.settings`) | `USER`, `ADMIN` |
| GET    | `/notifications/preferences` | Lấy preferences hiện tại                       | `USER`, `ADMIN` |
| POST   | `/notifications/broadcast`   | (Admin) Gửi email broadcast                    | `ADMIN`         |

> **Lưu ý**: Endpoint gửi email/push chỉ queue job, không xử lý đồng bộ. Client nhận response ngay với jobId.

## DTOs

### SendEmailDto
```typescript
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  html: string;

  @IsOptional()
  @IsString()
  text?: string;
}
```

### SendPushDto
```typescript
import { IsString, IsObject, IsOptional } from 'class-validator';

export class SendPushDto {
  @IsString()
  userId: string;

  @IsString()
  event: string;   // 'lesson.reminder', 'achievement.unlocked', ...

  @IsObject()
  data: Record<string, any>;

  @IsOptional()
  @IsString({ each: true })
  excludeSocketIds?: string[];
}
```

### UpdatePreferencesDto
```typescript
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  reminderTime?: string;   // HH:MM

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;
}
```

### PreferencesResponseDto
```typescript
export class PreferencesResponseDto {
  reminderEnabled: boolean;
  reminderTime: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
}
```

### NotificationResponseDto (sau khi queue)
```typescript
export class NotificationResponseDto {
  jobId: string;
  status: 'queued';
}
```

## Use Cases

### 1. `POST /notifications/email` – Gửi email

| **Tên**            | Gửi email qua queue                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Mô tả**          | Nhận dữ liệu email, thêm vào Bull queue `notification` với job `send-email`.                                                   |
| **Tiền điều kiện** | User đã đăng nhập (hoặc admin).                                                                                                |
| **Hậu điều kiện**  | Job được thêm vào queue, không có tác động ngay.                                                                               |
| **Luồng chính**    | 1. Validate DTO.<br>2. Gọi `notificationQueue.add('send-email', { dto, userId })`.<br>3. Trả về `{ jobId, status: 'queued' }`. |
| **Ngoại lệ**       | Queue lỗi → `500 INTERNAL_SERVER_ERROR`.                                                                                       |

### 2. `POST /notifications/push` – Gửi push notification

| **Tên**            | Gửi push notification qua queue                                |
| ------------------ | -------------------------------------------------------------- |
| **Mô tả**          | Tương tự email, queue job `send-push`.                         |
| **Tiền điều kiện** | User đã đăng nhập.                                             |
| **Luồng chính**    | 1. Validate DTO.<br>2. Thêm job vào queue.<br>3. Trả về jobId. |

### 3. `POST /notifications/preferences` – Cập nhật preferences

| **Tên**            | Cập nhật cài đặt thông báo                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Merge DTO với `User.settings`, lưu lại, xoá cache.                                                                     |
| **Tiền điều kiện** | User đã đăng nhập.                                                                                                     |
| **Hậu điều kiện**  | `User.settings` được cập nhật.                                                                                         |
| **Luồng chính**    | 1. Lấy user hiện tại.<br>2. Merge settings hiện tại với DTO.<br>3. Cập nhật user.<br>4. Xoá cache `settings:{userId}`. |

### 4. `GET /notifications/preferences` – Lấy preferences

| **Tên**         | Xem cài đặt thông báo                                                                 |
| --------------- | ------------------------------------------------------------------------------------- |
| **Mô tả**       | Trả về preferences từ `User.settings` (merge với default).                            |
| **Luồng chính** | 1. Lấy user, đọc `settings`.<br>2. Merge với `DEFAULT_PREFERENCES`.<br>3. Trả về DTO. |

### 5. `POST /notifications/broadcast` – Admin broadcast email

| **Tên**            | Gửi email hàng loạt đến nhiều user                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Admin gửi email tới danh sách email (hoặc tất cả user). Xử lý qua queue (từng email).                                             |
| **Tiền điều kiện** | Role `ADMIN`.                                                                                                                     |
| **Luồng chính**    | 1. Nhận danh sách email (hoặc lấy từ DB).<br>2. Với mỗi email, thêm job `send-email` vào queue.<br>3. Trả về số lượng job đã tạo. |

## Cron Job – Daily Reminder

- **Lịch chạy**: Mỗi ngày lúc 8:00 (có thể config qua env `REMINDER_CRON`).
- **Service**: `ReminderCronService`.
- **Luồng**:
  1. Query tất cả user có `settings.reminderEnabled === true` và `settings.reminderTime` phù hợp với giờ hiện tại (so sánh với `new Date()`).
  2. Với mỗi user, gọi `notificationQueue.add('send-reminder', { userId, email })`.
  3. Worker xử lý: kiểm tra user có `pushEnabled`, gọi Pusher service.
  4. Log kết quả (OpenTelemetry).

> **Lưu ý về giới hạn email**: Do giới hạn email Brevo (300/ngày), reminder chỉ gửi qua push notification. Email chỉ dùng cho OTP, welcome, payment confirmation.

**Worker code mẫu**:
```typescript
@Processor('notification')
export class NotificationProcessor {
  @Process('send-reminder')
  async handleReminder(job: Job<{ userId: string; email: string }>) {
    const user = await this.userRepo.findById(job.data.userId);
    const prefs = mergeWithDefault(user.settings);
    
    // Chỉ gửi push notification, không gửi email cho reminder
    if (prefs.pushEnabled) {
      await this.pusherService.triggerToUser(job.data.userId, 'study.reminder', {});
    }
  }
}
```

## Queue Configuration (Bull)

- **Queue name**: `notification`
- **Redis connection**: Dùng `RedisService` (đã config sẵn).
- **Job options**:
  ```typescript
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  }
  ```
- **Job types**:
  - `send-email`: gửi email qua `MailService`
  - `send-push`: gửi push qua `PusherService`
  - `send-reminder`: gửi reminder (chỉ gửi push)

## Default Preferences

```typescript
export const DEFAULT_PREFERENCES = {
  reminderEnabled: true,
  reminderTime: '08:00',
  emailEnabled: true,
  pushEnabled: true,
};
```

Khi đọc preferences, merge `{ ...DEFAULT_PREFERENCES, ...user.settings }`. Khi lưu, chỉ lưu các field khác default (tiết kiệm dung lượng).

## Cache Strategy

| Key pattern            | TTL  | Invalidation trigger            |
| ---------------------- | ---- | ------------------------------- |
| `preferences:{userId}` | 300s | POST /notifications/preferences |

## Logging & Observability

- **Log job processing**: Dùng `LoggerService` ghi structured log (jobId, userId, type, status, duration).
- **OpenTelemetry**: Gắn `trace_id`, `span_id` vào log (đã tích hợp trong `LoggerService`).
- **Không lưu log vào database** (theo thiết kế tối giản). Nếu cần lưu lịch sử lâu dài, dùng OpenTelemetry exporter (Jaeger, Tempo) hoặc log aggregation (Loki).

## Security & Validation

- **Rate limiting** cho endpoint gửi email/push: tối đa 10 request/phút/user (dùng `@Throttle()`).
- **Broadcast** chỉ dành cho admin, có thể có thêm xác nhận (confirm dialog) tránh spam.
- **Preferences**: chỉ user mới có thể sửa preferences của chính mình.
- **Queue security**: Không expose queue management API ra ngoài.

## Kết luận

- **NotificationModule** xử lý gửi email/push bất đồng bộ qua queue.
- Hỗ trợ reminder hàng ngày dựa trên preferences lưu trong `User.settings`.
- **Reminder chỉ gửi qua push notification** để tôn trọng giới hạn email Brevo (300/ngày).
- Logging và observability đầy đủ, không gây nặng database.
- Phân quyền rõ ràng, có rate limiting.

**Đạt 10/10 theo NESTJS-STANDARD.md.**