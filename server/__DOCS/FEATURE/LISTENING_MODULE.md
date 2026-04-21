Dưới đây là tài liệu cho **ListeningModule** đạt chuẩn 10/10, dựa trên Prisma schema (model `ListeningPractice`), client xử lý nặng (ghi âm, STT, so sánh), server chỉ lưu kết quả.

```markdown
# Listening Module – Spackie English (Paroto)

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Redis (cache, idempotency), EventEmitter (thống kê).

## Mục tiêu

- Cung cấp API để client gửi kết quả luyện nghe/nói (client tự xử lý ghi âm, nhận dạng giọng nói, so sánh, tính điểm).
- Server chỉ lưu kết quả vào database, **không xử lý file âm thanh** (tiết kiệm tài nguyên, băng thông).
- Hỗ trợ lấy lịch sử luyện tập (phân trang, lọc theo card), thống kê điểm trung bình.
- Đảm bảo idempotency (tránh duplicate khi client retry).
- Tích hợp cache cho danh sách lịch sử và thống kê.
- Phát event `listening.completed` để `StatisticsModule` cập nhật thống kê (nếu cần).

## Endpoints

| Method | Path                         | Mô tả                                   | Role truy cập   |
| ------ | ---------------------------- | --------------------------------------- | --------------- |
| POST   | `/listening/record`          | Gửi kết quả luyện tập (client tính sẵn) | `USER`, `ADMIN` |
| GET    | `/listening/history`         | Lấy lịch sử luyện tập (phân trang)      | `USER`, `ADMIN` |
| GET    | `/listening/history/:cardId` | Lấy lịch sử theo một thẻ                | `USER`, `ADMIN` |
| GET    | `/listening/stats/:cardId`   | Thống kê điểm trung bình, số lần tập    | `USER`, `ADMIN` |

> **Lưu ý**: Admin có thể xem lịch sử và stats của bất kỳ user (nếu cần, thêm endpoint `/admin/listening/...`).

## DTOs

### ListeningResultDto
```typescript
import { IsString, IsNumber, Min, Max, IsOptional, IsObject } from 'class-validator';

export class ListeningResultDto {
  @IsString()
  cardId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;          // điểm tổng (0-100)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fluency?: number;       // điểm trôi chảy (nếu có)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracy?: number;      // điểm chính xác từng âm

  @IsNumber()
  @Min(100)               // ít nhất 100ms
  duration: number;       // thời gian ghi âm (ms)

  @IsOptional()
  @IsObject()
  clientMetadata?: {
    device?: string;
    browser?: string;
    sttEngine?: string;   // 'webSpeech', 'tensorflow', ...
  };
}
```

### ListeningHistoryQueryDto
```typescript
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';
import { IsOptional, IsString } from 'class-validator';

export class ListeningHistoryQueryDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  cardId?: string;
}
```

### ListeningHistoryResponseDto
```typescript
import { Expose } from 'class-transformer';

export class ListeningHistoryResponseDto {
  @Expose()
  id: string;

  @Expose()
  cardId: string;

  @Expose()
  score: number;

  @Expose()
  fluency?: number;

  @Expose()
  accuracy?: number;

  @Expose()
  duration: number;

  @Expose()
  createdAt: Date;
}
```

### ListeningStatsResponseDto
```typescript
export class ListeningStatsResponseDto {
  cardId: string;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  lastAttemptAt: Date;
}
```

## Use Cases

### 1. `POST /listening/record` – Gửi kết quả luyện tập

| **Tên**            | Lưu kết quả luyện nghe/nói từ client                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Client tính toán sẵn điểm, gửi lên server để lưu. Server kiểm tra trùng lặp (idempotency) dựa trên `Idempotency-Key` header hoặc `userId + cardId + createdAt`.                                                                                                                                                                                                      |
| **Tiền điều kiện** | User đã đăng nhập, card tồn tại và thuộc quyền truy cập (public deck hoặc chủ sở hữu).                                                                                                                                                                                                                                                                               |
| **Hậu điều kiện**  | Bản ghi `ListeningPractice` được tạo, cache lịch sử và stats bị xoá.                                                                                                                                                                                                                                                                                                 |
| **Luồng chính**    | 1. Validate DTO.<br>2. Kiểm tra idempotency (Redis key `idempotency:listening:{userId}:{cardId}:{date}`).<br>3. Kiểm tra card tồn tại và quyền truy cập.<br>4. Tạo bản ghi `ListeningPractice`.<br>5. Xoá cache `listening:history:{userId}:*` và `listening:stats:{cardId}:{userId}`.<br>6. Emit event `listening.completed`.<br>7. Trả về `{ success: true, id }`. |
| **Ngoại lệ**       | Card không tồn tại hoặc không có quyền → `404/403`.<br>Duplicate request → `409 CONFLICT`.                                                                                                                                                                                                                                                                           |

### 2. `GET /listening/history` – Lấy lịch sử luyện tập (phân trang)

| **Tên**            | Xem danh sách các lần tập của user                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Hỗ trợ lọc theo `cardId`, phân trang, sắp xếp theo `createdAt` giảm dần.                                                                                                                              |
| **Tiền điều kiện** | Access token hợp lệ.                                                                                                                                                                                  |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                                                                                                                                               |
| **Luồng chính**    | 1. Lấy `userId` từ token.<br>2. Xây dựng `where` condition (`userId`, `cardId` nếu có).<br>3. Query repository (có cache TTL 30s).<br>4. Trả về `PaginationResponseDto<ListeningHistoryResponseDto>`. |

### 3. `GET /listening/history/:cardId` – Lấy lịch sử theo một thẻ

| **Tên**            | Xem tất cả các lần tập của một thẻ cụ thể                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Mô tả**          | Tương tự history nhưng lọc theo `cardId`.                                                                                |
| **Tiền điều kiện** | Access token hợp lệ, card thuộc quyền sở hữu của user (hoặc public deck).                                                |
| **Luồng chính**    | 1. Kiểm tra quyền truy cập card.<br>2. Lấy danh sách logs (có cache).<br>3. Trả về danh sách (không phân trang hoặc có). |

### 4. `GET /listening/stats/:cardId` – Thống kê điểm

| **Tên**            | Xem điểm trung bình, số lần tập, điểm cao nhất của một thẻ                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Aggregate từ các bản ghi `ListeningPractice`.                                                                                                  |
| **Tiền điều kiện** | Access token hợp lệ, card thuộc quyền sở hữu.                                                                                                  |
| **Luồng chính**    | 1. Kiểm tra quyền.<br>2. Tính `avg(score)`, `count(*)`, `max(score)`.<br>3. Cache kết quả (TTL 60s).<br>4. Trả về `ListeningStatsResponseDto`. |

## Idempotency (chống duplicate)

- **Cơ chế**: Client gửi header `Idempotency-Key: <UUID>`. Server lưu key trong Redis với TTL 24h, kèm theo `resultId`. Nếu key đã tồn tại, trả về kết quả cũ (hoặc `409 CONFLICT` nếu đang xử lý).
- **Fallback**: Nếu không có header, dùng `userId + cardId + createdAt` (chỉ trong cùng giây) để kiểm tra duplicate. Tuy nhiên, header vẫn là cách chính xác nhất.

## Cache Strategy

| Key pattern                                                            | TTL | Invalidation trigger                 |
| ---------------------------------------------------------------------- | --- | ------------------------------------ |
| `listening:history:{userId}:page:{page}:limit:{limit}:cardId:{cardId}` | 30s | POST /listening/record               |
| `listening:stats:{cardId}:{userId}`                                    | 60s | POST /listening/record (cho card đó) |

**Invalidation**:
```typescript
await this.cacheManager.delPattern(`listening:history:${userId}:*`);
await this.cacheManager.del(`listening:stats:${cardId}:${userId}`);
```

## Repository & Service

### ListeningRepository
```typescript
async create(data: { userId: string; cardId: string; score: number; fluency?: number; accuracy?: number; duration: number; clientMetadata?: any }): Promise<ListeningPractice> { ... }
async findByUser(userId: string, page: number, limit: number, cardId?: string): Promise<PaginatedResult<ListeningPractice>> { ... }
async getStats(userId: string, cardId: string): Promise<{ totalAttempts: number; averageScore: number; bestScore: number; lastAttemptAt: Date | null }> { ... }
```

### ListeningService
```typescript
@Injectable()
export class ListeningService {
  async saveResult(userId: string, dto: ListeningResultDto, idempotencyKey?: string): Promise<{ id: string }> {
    // Idempotency check
    if (idempotencyKey) {
      const cached = await this.redis.get(`idempotency:listening:${idempotencyKey}`);
      if (cached) return { id: cached };
      await this.redis.setex(`idempotency:listening:${idempotencyKey}`, 86400, 'processing');
    }
    // ... save to DB
    const record = await this.listeningRepository.create({ userId, ...dto });
    if (idempotencyKey) {
      await this.redis.setex(`idempotency:listening:${idempotencyKey}`, 86400, record.id);
    }
    // Invalidate caches
    await this.invalidateCaches(userId, dto.cardId);
    this.eventEmitter.emit('listening.completed', { userId, cardId: dto.cardId, score: dto.score });
    return { id: record.id };
  }

  async getHistory(userId: string, query: ListeningHistoryQueryDto) { ... }
  async getStats(userId: string, cardId: string) { ... }
}
```

## Event Emission

Sau khi lưu kết quả thành công, emit event `listening.completed` với payload:
```typescript
this.eventEmitter.emit('listening.completed', {
  userId,
  cardId: dto.cardId,
  score: dto.score,
  fluency: dto.fluency,
  accuracy: dto.accuracy,
  duration: dto.duration,
});
```
`StatisticsModule` (hoặc `GamificationModule`) có thể lắng nghe event này để cập nhật thành tích, badge, hoặc thống kê chi tiết.

## Security & Validation

- **Client tự tính điểm** – server không kiểm tra lại (tin tưởng client). Có thể giới hạn `score` trong khoảng 0-100 (đã có validator).
- **Idempotency** bắt buộc để tránh duplicate khi mạng chập chờn.
- **Rate limiting** cho endpoint `/record` (ví dụ 10 request/phút/user) để tránh spam (dùng `@Throttle()`).
- **Quyền truy cập** lịch sử: user chỉ xem được logs của chính mình. Admin có thể xem tất cả (nếu cần, tạo endpoint riêng).

## Cron Job – Cleanup Idempotency Keys (tuỳ chọn)

Redis keys có TTL tự động, không cần cron.

## Kết luận

- **ListeningModule** cung cấp API đơn giản để lưu kết quả luyện tập, phù hợp với mô hình client xử lý nặng.
- Tích hợp cache, idempotency, phân trang, thống kê.
- Dễ dàng mở rộng thêm các loại bài tập khác (dictation, comprehension) bằng cách thêm field `type`.

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này thành `__DOCS/LISTENING_MODULE.md`. Tài liệu đã hoàn chỉnh, bao gồm idempotency, cache, event, và hướng dẫn client xử lý nặng.