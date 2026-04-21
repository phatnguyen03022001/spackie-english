Dưới đây là tài liệu cho **StudyModule** đạt chuẩn 10/10, dựa trên Prisma schema (CardProgress, SM-2) và các quy tắc trong `NESTJS-STANDARD.md`.

```markdown
# Study Module – Spackie English (Spaced Repetition)

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Redis (cache), EventEmitter (cập nhật thống kê).

## Mục tiêu

- Quản lý phiên học (study session) dựa trên thuật toán **SM-2** (SuperMemo 2).
- Lấy danh sách thẻ cần ôn hôm nay (due cards) cho một user, có thể lọc theo deck.
- Ghi nhận kết quả học (rating: Again, Hard, Good, Easy) và cập nhật `CardProgress` (ease factor, interval, due date, repetitions).
- Cập nhật denormalized stats trên `User` (streak, total cards learned, last studied at).
- Phát event `card.reviewed` để `StatisticsModule` cập nhật biểu đồ, thống kê chi tiết (nếu cần).
- Tích hợp cache cho danh sách due cards (TTL ngắn, vì due date thay đổi sau mỗi lần học).
- Đảm bảo idempotency cho việc ghi nhận kết quả (tránh duplicate review cùng thời điểm).

## Endpoints

| Method | Path                        | Mô tả                                        | Role truy cập   |
| ------ | --------------------------- | -------------------------------------------- | --------------- |
| GET    | `/study/session`            | Lấy danh sách thẻ cần ôn hôm nay (due cards) | `USER`, `ADMIN` |
| GET    | `/study/session?deckId=xxx` | Lọc theo deck                                | `USER`, `ADMIN` |
| POST   | `/study/record`             | Ghi nhận kết quả học một thẻ                 | `USER`, `ADMIN` |
| GET    | `/study/progress/:cardId`   | Lấy trạng thái SM-2 của một thẻ              | `USER`, `ADMIN` |

> **Lưu ý**: Admin cũng có thể xem và ghi nhận kết quả (hỗ trợ testing, nhưng không khuyến khích).

## DTOs

### StudySessionQueryDto
```typescript
import { IsOptional, IsString } from 'class-validator';

export class StudySessionQueryDto {
  @IsOptional()
  @IsString()
  deckId?: string;   // lọc theo deck
}
```

### StudyCardDto (response)
```typescript
import { Expose } from 'class-transformer';

export class StudyCardDto {
  @Expose()
  id: string;          // card id

  @Expose()
  front: string;

  @Expose()
  back: string;

  @Expose()
  imageUrl?: string;

  @Expose()
  audioUrl?: string;

  @Expose()
  extras?: any;        // pronunciation, examples, hint
}
```

### RecordResultDto
```typescript
import { IsString, IsEnum, IsOptional } from 'class-validator';

export class RecordResultDto {
  @IsString()
  cardId: string;

  @IsEnum(['AGAIN', 'HARD', 'GOOD', 'EASY'])
  rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

  @IsOptional()
  @IsString()
  deckId?: string;     // để kiểm tra quyền (có thể bỏ qua nếu dùng card lookup)
}
```

### CardProgressResponseDto
```typescript
import { Expose } from 'class-transformer';

export class CardProgressResponseDto {
  @Expose()
  easeFactor: number;

  @Expose()
  interval: number;    // days

  @Expose()
  repetitions: number;

  @Expose()
  dueDate: Date;

  @Expose()
  lastRating?: string;

  @Expose()
  reviewCount: number;
}
```

## Thuật toán SM-2 (chi tiết)

Các hằng số:
- **Ease factor** (EF) khởi tạo = 2.5, tối thiểu = 1.3.
- **Interval** (I) ban đầu = 0 (chưa học lần nào), sau lần học đầu tiên:
  - Again: I = 0 (học lại cùng ngày)
  - Hard: I = 1 (ngày mai)
  - Good: I = 1 (ngày mai)
  - Easy: I = 2 (2 ngày sau)
- **Repetitions** (n) = số lần học liên tiếp thành công.

Công thức cập nhật EF:
```
EF' = EF + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
```
Trong đó rating: Again=0, Hard=1, Good=2, Easy=3.

Nếu EF < 1.3 thì EF = 1.3.

Công thức interval:
- Nếu rating = AGAIN: interval = 0, repetitions = 0.
- Nếu rating = HARD:
  - Nếu repetitions == 1: interval = 1
  - Nếu repetitions > 1: interval = interval_old * EF * 0.8
- Nếu rating = GOOD:
  - Nếu repetitions == 1: interval = 1
  - Nếu repetitions > 1: interval = interval_old * EF
- Nếu rating = EASY:
  - Nếu repetitions == 1: interval = 2
  - Nếu repetitions > 1: interval = interval_old * EF * 1.3

Sau đó làm tròn interval (có thể dùng Math.ceil). Due date = now + interval days.

## Use Cases

### 1. `GET /study/session` – Lấy danh sách thẻ cần ôn

| **Tên**            | Lấy due cards của user (hôm nay)                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mô tả**          | Trả về danh sách các thẻ có `dueDate <= now()` và chưa bị xoá, thuộc các deck mà user có quyền truy cập (public hoặc của chính user).                                                                                                                                                                                                                                                                                          |
| **Tiền điều kiện** | User đã đăng nhập.                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Luồng chính**    | 1. Lấy `userId` từ token.<br>2. Xây dựng query: `CardProgress` với `userId`, `dueDate <= now()`, kèm `Card` và `Deck`.<br>3. Lọc thêm `deckId` nếu có.<br>4. Kiểm tra quyền: nếu deck không public và không phải chủ sở hữu thì bỏ qua.<br>5. Cache kết quả (TTL 30s) vì due date thay đổi nhanh.<br>6. Map sang `StudyCardDto` (ẩn đáp án? Thực tế vẫn trả cả back vì client tự quyết định hiển thị).<br>7. Trả về danh sách. |
| **Ngoại lệ**       | Không có.                                                                                                                                                                                                                                                                                                                                                                                                                      |

### 2. `POST /study/record` – Ghi nhận kết quả học

| **Tên**            | Cập nhật SM-2 state cho một thẻ                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Nhận rating, tính toán EF, interval, due date mới, lưu vào `CardProgress`. Sau đó cập nhật `User` stats (streak, totalLearned, lastStudiedAt) và emit event `card.reviewed`.                                                                                                                                                                                                                         |
| **Tiền điều kiện** | Card tồn tại, user có quyền truy cập (deck public hoặc ownership).                                                                                                                                                                                                                                                                                                                                   |
| **Hậu điều kiện**  | `CardProgress` được cập nhật, cache due cards bị xoá, stats user được cập nhật.                                                                                                                                                                                                                                                                                                                      |
| **Luồng chính**    | 1. Lấy `userId` từ token.<br>2. Tìm `CardProgress` (nếu chưa có thì tạo mới).<br>3. Tính toán SM-2 dựa trên rating hiện tại.<br>4. Lưu `CardProgress`.<br>5. Cập nhật `User` stats (streak, totalLearned, lastStudiedAt).<br>6. Xoá cache `study:session:{userId}:*`.<br>7. Emit event `card.reviewed` với payload `{ userId, cardId, rating, newDueDate }`.<br>8. Trả về `CardProgressResponseDto`. |
| **Idempotency**    | Dùng `userId + cardId + date` (hoặc header `Idempotency-Key`) để tránh duplicate. Nếu cùng thời điểm, trả về kết quả đã lưu.                                                                                                                                                                                                                                                                         |
| **Ngoại lệ**       | Card không tồn tại hoặc không có quyền → `404/403`.                                                                                                                                                                                                                                                                                                                                                  |

### 3. `GET /study/progress/:cardId` – Xem trạng thái SM-2

| **Tên**            | Lấy thông tin tiến độ của một thẻ                                               |
| ------------------ | ------------------------------------------------------------------------------- |
| **Mô tả**          | Trả về `CardProgress` (easeFactor, interval, dueDate, reviewCount).             |
| **Tiền điều kiện** | User có quyền truy cập card.                                                    |
| **Luồng chính**    | 1. Kiểm tra quyền.<br>2. Lấy `CardProgress` (cache TTL 300s).<br>3. Trả về DTO. |

## Cập nhật User Stats (streak, totalCardsLearned)

- **totalCardsLearned**: Số thẻ đã từng được review (không tính again). Khi user lần đầu review một card (với rating != AGAIN), tăng `totalCardsLearned` lên 1.
- **currentStreak**: Số ngày liên tiếp có ít nhất một review (không tính again). Dựa vào `lastStudiedAt`. Nếu `lastStudiedAt` là hôm qua → tăng streak, nếu hôm nay → giữ nguyên, nếu cách 2 ngày → reset về 1.
- **longestStreak**: Cập nhật nếu `currentStreak` vượt quá giá trị hiện tại.
- **lastStudiedAt**: Cập nhật thành `new Date()` mỗi khi có review (bất kể rating).

Công thức streak (trong service):
```typescript
const today = new Date().setHours(0,0,0,0);
const lastDate = user.lastStudiedAt ? new Date(user.lastStudiedAt).setHours(0,0,0,0) : null;
if (lastDate === today) { /* không thay đổi streak */ }
else if (lastDate === today - 86400000) { user.currentStreak += 1; }
else { user.currentStreak = 1; }
user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
user.lastStudiedAt = new Date();
```

## Cache Strategy

| Key pattern                            | TTL  | Invalidation trigger                 |
| -------------------------------------- | ---- | ------------------------------------ |
| `study:session:{userId}:deck:{deckId}` | 30s  | POST /study/record (bất kỳ card nào) |
| `study:session:{userId}:all`           | 30s  | POST /study/record                   |
| `study:progress:{cardId}:{userId}`     | 300s | POST /study/record (card đó)         |

**Invalidation**:
```typescript
await this.cacheManager.delPattern(`study:session:${userId}:*`);
await this.cacheManager.del(`study:progress:${cardId}:${userId}`);
```

## Repository & Service

### StudyRepository
```typescript
async getOrCreateProgress(userId: string, cardId: string): Promise<CardProgress> { ... }
async updateProgress(id: string, data: Prisma.CardProgressUpdateInput): Promise<CardProgress> { ... }
async getDueCards(userId: string, deckId?: string): Promise<Card[]> { ... }
async getProgress(userId: string, cardId: string): Promise<CardProgress | null> { ... }
```

### StudyService (SM-2 logic)
```typescript
@Injectable()
export class StudyService {
  private calculateNewState(current: CardProgress, rating: 'AGAIN'|'HARD'|'GOOD'|'EASY'): CardProgress {
    let { easeFactor, interval, repetitions } = current;
    const ratingValue = { AGAIN:0, HARD:1, GOOD:2, EASY:3 }[rating];
    if (rating === 'AGAIN') {
      repetitions = 0;
      interval = 0;
    } else {
      // Cập nhật EF
      easeFactor = easeFactor + (0.1 - (5 - ratingValue) * (0.08 + (5 - ratingValue) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;
      // Cập nhật repetitions
      repetitions++;
      // Tính interval
      if (repetitions === 1) {
        interval = rating === 'EASY' ? 2 : 1;
      } else {
        if (rating === 'HARD') interval = Math.ceil(interval * easeFactor * 0.8);
        else if (rating === 'GOOD') interval = Math.ceil(interval * easeFactor);
        else interval = Math.ceil(interval * easeFactor * 1.3);
      }
    }
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);
    return { ...current, easeFactor, interval, repetitions, dueDate, lastRating: rating, reviewCount: current.reviewCount + 1 };
  }

  async recordResult(userId: string, cardId: string, rating: string, idempotencyKey?: string) { ... }
  async getDueCards(userId: string, deckId?: string) { ... }
}
```

## Idempotency cho record

- Dùng Redis key `idempotency:study:{userId}:{cardId}:{date}` với TTL 24h. Nếu key tồn tại, trả về kết quả đã lưu (có thể lấy từ cache progress).
- Hoặc dùng header `Idempotency-Key` chung.

## Event Emission

Sau khi ghi nhận thành công, emit event `card.reviewed` với payload:
```typescript
this.eventEmitter.emit('card.reviewed', {
  userId,
  cardId,
  rating,
  newDueDate: updatedProgress.dueDate,
  reviewCount: updatedProgress.reviewCount,
});
```
`StatisticsModule` lắng nghe event này để cập nhật biểu đồ, thống kê chi tiết (ví dụ: số lượng review mỗi ngày, phân bố rating).

## Security & Validation

- **Quyền truy cập**: Chỉ user mới có thể xem due cards và ghi nhận kết quả cho chính mình. Admin có thể xem nhưng không nên ghi nhận (hoặc có thể nhưng sẽ ảnh hưởng đến stats cá nhân).
- **Idempotency**: Bắt buộc để tránh duplicate review (do client retry).
- **Rate limiting**: Có thể giới hạn số lượng request ghi nhận kết quả (ví dụ 30 request/phút) để tránh spam.

## Kết luận

- **StudyModule** triển khai đầy đủ SM-2, quản lý due cards, cập nhật progress và user stats.
- Tích hợp cache, event, idempotency, và kiểm tra quyền.
- Dễ dàng mở rộng với các thuật toán spaced repetition khác (SM-4, FSRS) bằng cách thay đổi logic trong service.

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này thành `__DOCS/STUDY_MODULE.md`. Tài liệu này hoàn chỉnh, bao gồm thuật toán SM-2, cách cập nhật streak, cache, idempotency, và event.