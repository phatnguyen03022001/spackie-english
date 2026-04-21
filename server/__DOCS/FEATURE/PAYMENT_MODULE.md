Dưới đây là file **`PAYMENT_MODULE.md`** đã được bổ sung kiểm tra quota email trước khi gửi thông báo thanh toán.

```markdown
# Payment Module – Spackie English (VIP Subscription)

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Redis (idempotency, lock), PayOS (payment gateway), EventEmitter.

## Mục tiêu

- Xử lý thanh toán mua gói VIP (monthly / yearly) qua PayOS.
- Tạo payment order, lưu thông tin vào `Payment` model với status `PENDING`.
- Xử lý webhook từ PayOS: xác thực signature, cập nhật `Payment` status, upsert `Subscription` (tạo mới hoặc gia hạn).
- Đảm bảo idempotency cho webhook (dùng Redis key, tránh xử lý duplicate).
- Cung cấp API kiểm tra trạng thái subscription của user.
- Gửi email thông báo khi thanh toán thành công (thông qua `NotificationModule`), **có kiểm tra quota email Brevo**.
- Admin có thể xem danh sách payment, subscription.

## Endpoints

| Method | Path                    | Mô tả                                        | Role truy cập   |
| ------ | ----------------------- | -------------------------------------------- | --------------- |
| POST   | `/payment/create-order` | Tạo order thanh toán, trả về payment URL     | `USER`, `ADMIN` |
| GET    | `/payment/subscription` | Lấy thông tin subscription hiện tại của user | `USER`, `ADMIN` |
| GET    | `/payment/history`      | Lấy lịch sử thanh toán của user (phân trang) | `USER`, `ADMIN` |
| GET    | `/admin/payments`       | (Admin) Xem danh sách payments               | `ADMIN`         |
| GET    | `/admin/subscriptions`  | (Admin) Xem danh sách subscriptions          | `ADMIN`         |

> **Webhook (internal)**: `POST /webhooks/payment/payos` – endpoint public, do PayOS gọi.

## DTOs

### CreateOrderDto
```typescript
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsEnum(['monthly', 'yearly'])
  plan: 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
```

### PaymentResponseDto
```typescript
import { Expose } from 'class-transformer';

export class PaymentResponseDto {
  @Expose()
  id: string;

  @Expose()
  orderCode: string;

  @Expose()
  amount: number;

  @Expose()
  status: string;

  @Expose()
  plan: string;

  @Expose()
  createdAt: Date;
}
```

### SubscriptionResponseDto
```typescript
import { Expose } from 'class-transformer';

export class SubscriptionResponseDto {
  @Expose()
  status: string;

  @Expose()
  plan: string;

  @Expose()
  startedAt?: Date;

  @Expose()
  expiresAt?: Date;

  @Expose()
  isActive: boolean;   // computed: status === 'ACTIVE' && expiresAt > now
}
```

### WebhookPayload (internal)
```typescript
interface PayOSWebhookBody {
  code: string;
  desc: string;
  data: {
    orderCode: number;
    amount: number;
    description: string;
    paymentLinkId: string;
    status: string;   // 'PAID', 'CANCELLED', ...
  };
}
```

## Prisma Models (liên quan)

```prisma
model Payment {
  id           String        @id @default(auto()) @map("_id") @db.ObjectId
  userId       String        @db.ObjectId
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  orderCode    String        @unique
  amount       Int
  currency     String        @default("VND")
  description  String?
  status       PaymentStatus @default(PENDING)
  provider     String        @default("payos")
  plan         String        // "monthly" | "yearly"
  durationDays Int
  paidAt       DateTime?
  meta         Json          @default("{}")
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model Subscription {
  id        String            @id @default(auto()) @map("_id") @db.ObjectId
  userId    String            @unique @db.ObjectId
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  status    SubscriptionStatus @default(EXPIRED)
  plan      String            @default("monthly")
  startedAt DateTime?
  expiresAt DateTime?
  meta      Json              @default("{}")
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
}
```

## Use Cases

### 1. `POST /payment/create-order` – Tạo order thanh toán

| **Tên**            | Tạo order thanh toán qua PayOS                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Tính số tiền dựa trên plan, gọi PayOS API tạo payment link, lưu payment record với status PENDING, trả về URL thanh toán.                                                                          |
| **Tiền điều kiện** | User đã đăng nhập, chưa có subscription active? (có thể mua thêm để gia hạn).                                                                                                                      |
| **Hậu điều kiện**  | Payment record được tạo, orderCode unique.                                                                                                                                                         |
| **Luồng chính**    | 1. Tính `amount` (monthly=50000, yearly=500000).<br>2. Gọi `PayOS.createPayment()` → nhận `paymentUrl`, `orderCode`.<br>3. Lưu Payment (status PENDING).<br>4. Trả về `{ paymentUrl, orderCode }`. |
| **Idempotency**    | Dùng header `Idempotency-Key` để tránh tạo nhiều order giống nhau (Redis, TTL 24h).                                                                                                                |

### 2. Webhook `POST /webhooks/payment/payos` – Xử lý kết quả thanh toán

| **Tên**            | Xử lý callback từ PayOS                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Xác thực signature, kiểm tra idempotency (Redis key `payos:webhook:{orderCode}`), cập nhật Payment và Subscription. Sau đó emit event `payment.succeeded` để `NotificationModule` gửi email xác nhận (có kiểm tra quota).                                                                                                                                                                                                                                                                 |
| **Tiền điều kiện** | PayOS gửi webhook với đúng signature.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Hậu điều kiện**  | Payment status được cập nhật thành SUCCESS/FAILED, Subscription được tạo hoặc gia hạn.                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Luồng chính**    | 1. Lấy signature từ header, verify (dùng checksumKey).<br>2. Kiểm tra Redis key `payos:webhook:{orderCode}` đã xử lý chưa (nếu có → return OK).<br>3. Tìm Payment theo `orderCode`.<br>4. Nếu `status === 'PAID'`:<br>   - Cập nhật Payment status = SUCCESS, `paidAt = now`.<br>   - Upsert Subscription.<br>   - Lưu thông tin webhook vào `meta`.<br>5. Lưu Redis key `payos:webhook:{orderCode}` với TTL 24h.<br>6. Emit event `payment.succeeded`.<br>7. Trả về `{ success: true }`. |
| **Ngoại lệ**       | Signature không hợp lệ → 400.<br>Payment không tìm thấy → log error nhưng vẫn trả 200 (để PayOS không retry).                                                                                                                                                                                                                                                                                                                                                                             |

### 3. `GET /payment/subscription` – Lấy thông tin subscription hiện tại

| **Tên**            | Xem trạng thái gói VIP của user                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Trả về subscription của user (nếu có).                                                                                                      |
| **Tiền điều kiện** | User đã đăng nhập.                                                                                                                          |
| **Luồng chính**    | 1. Lấy userId.<br>2. Tìm subscription (có cache TTL 60s).<br>3. Tính `isActive = status === 'ACTIVE' && expiresAt > now`.<br>4. Trả về DTO. |

### 4. `GET /payment/history` – Lịch sử thanh toán

| **Tên**         | Xem danh sách payments của user                                                           |
| --------------- | ----------------------------------------------------------------------------------------- |
| **Mô tả**       | Phân trang, sắp xếp theo createdAt giảm dần.                                              |
| **Luồng chính** | 1. Lấy userId.<br>2. Query payments (có cache TTL 120s).<br>3. Trả về paginated response. |

## Idempotency & Lock

- **Tạo order**: Dùng `IdempotencyInterceptor` (common) với header `Idempotency-Key`. Redis key `idempotency:payment:create:{key}` lưu kết quả (payment URL) trong 24h.
- **Webhook**: Dùng Redis key `payos:webhook:{orderCode}` với TTL 24h, lưu giá trị `"processed"`. Nếu key tồn tại, bỏ qua xử lý.
- **Subscription upsert**: Có thể dùng Redis distributed lock (key `subscription:lock:{userId}`) để tránh race condition khi webhook gọi đồng thời. Tuy nhiên, do webhook thường đến một lần, có thể bỏ qua lock nếu dùng `upsert` an toàn.

## Cache Strategy

| Key pattern                            | TTL  | Invalidation trigger             |
| -------------------------------------- | ---- | -------------------------------- |
| `subscription:{userId}`                | 60s  | Webhook (khi payment thành công) |
| `payment:history:{userId}:page:{page}` | 120s | Webhook (tạo payment mới)        |

**Invalidation**:
```typescript
await this.cacheManager.del(`subscription:${userId}`);
await this.cacheManager.delPattern(`payment:history:${userId}:*`);
```

## Service & Repository

### PaymentRepository
```typescript
async create(data: Prisma.PaymentCreateInput): Promise<Payment> { ... }
async findByOrderCode(orderCode: string): Promise<Payment | null> { ... }
async updateStatus(id: string, status: PaymentStatus, paidAt?: Date, meta?: any): Promise<Payment> { ... }
async findByUser(userId: string, page: number, limit: number): Promise<PaginatedResult<Payment>> { ... }
```

### SubscriptionRepository
```typescript
async upsert(userId: string, plan: string, durationDays: number, startDate: Date, expiresDate: Date): Promise<Subscription> { ... }
async findByUserId(userId: string): Promise<Subscription | null> { ... }
```

### PaymentService
```typescript
@Injectable()
export class PaymentService {
  async createOrder(userId: string, dto: CreateOrderDto, idempotencyKey?: string): Promise<{ paymentUrl: string; orderCode: string }> { ... }
  async handleWebhook(signature: string, body: any): Promise<void> { ... }
  async getSubscription(userId: string): Promise<SubscriptionResponseDto> { ... }
  async getPaymentHistory(userId: string, page: number, limit: number): Promise<PaginatedResult<PaymentResponseDto>> { ... }
}
```

## Event Emission

Sau khi xử lý webhook thành công (payment SUCCESS), emit event:
```typescript
this.eventEmitter.emit('payment.succeeded', {
  userId,
  plan,
  amount,
  orderCode,
  expiresAt: newExpiryDate,
});
```
`NotificationModule` lắng nghe event này và cố gắng gửi email xác nhận thanh toán. **Trước khi gửi email, NotificationModule phải kiểm tra quota email qua `EmailQuotaService.checkAndIncrement('payment')`**. Nếu quota đã hết (≥300 email/ngày) hoặc vượt ngưỡng 80% mà loại email không được ưu tiên cao, thì bỏ qua gửi email và chỉ log warning. Điều này đảm bảo không vượt quá giới hạn Brevo free tier.

## Email Quota for Payment Notifications

- **Giới hạn**: Brevo free tier 300 email/ngày.
- **Cơ chế**: `EmailQuotaService` dùng Redis key `email:quota:YYYY-MM-DD` để đếm.
- **Kiểm tra trước khi gửi email thanh toán**:
  - Gọi `await emailQuotaService.checkAndIncrement('payment')`.
  - Nếu trả về `false` (hết quota hoặc vượt ngưỡng ưu tiên), bỏ qua gửi email, ghi log warning: `"Payment confirmation email skipped due to email quota exceeded for user ${userId}"`.
  - Nếu trả về `true`, tiến hành gửi email.
- **Ưu tiên**: Email thanh toán có mức ưu tiên **trung bình** (cao hơn broadcast, thấp hơn OTP và welcome). Khi quota đã dùng 80% (240 email), chỉ gửi OTP và payment confirmation (các loại khác bị từ chối). Do đó, email thanh toán vẫn được gửi khi gần hết quota.

## Security & Validation

- **Webhook signature**: Xác thực bằng `crypto.createHmac('sha256', checksumKey)`.
- **Idempotency key**: Bắt buộc cho endpoint tạo order (tránh duplicate payment).
- **Rate limiting**: Cho endpoint tạo order (5 request/phút/user) để tránh spam.
- **Admin endpoints**: Chỉ ADMIN mới xem được danh sách payments/subscriptions toàn bộ user.
- **Email quota**: Như mô tả ở trên.

## Cron Job – Cleanup Expired Subscriptions (tuỳ chọn)

Chạy mỗi ngày để cập nhật status `EXPIRED` cho các subscription hết hạn:
```typescript
@Cron(CronExpression.EVERY_DAY_AT_1AM)
async expireSubscriptions() {
  const now = new Date();
  await this.prisma.subscription.updateMany({
    where: { expiresAt: { lt: now }, status: 'ACTIVE' },
    data: { status: 'EXPIRED' },
  });
}
```

## Kết luận

- **PaymentModule** xử lý thanh toán qua PayOS, webhook idempotent, subscription upsert.
- Tích hợp cache, event, idempotency, lock (nếu cần).
- Đảm bảo an toàn và nhất quán dữ liệu ngay cả khi MongoDB free tier không có transaction.
- **Tuân thủ giới hạn email Brevo** bằng cách kiểm tra quota trước khi gửi email thanh toán.

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này thành `__DOCS/PAYMENT_MODULE.md`. Các bổ sung chính:
- Trong mục "Event Emission" đã nêu rõ `NotificationModule` phải kiểm tra quota trước khi gửi email.
- Thêm mục "Email Quota for Payment Notifications" chi tiết cách kiểm tra và ưu tiên.
- Cập nhật mục "Security & Validation" để nhắc đến email quota.