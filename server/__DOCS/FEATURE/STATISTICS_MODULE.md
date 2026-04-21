Dưới đây là tài liệu cho **StatisticsModule** đạt chuẩn 10/10, dựa trên Prisma schema (User denormalized fields, CardProgress, ListeningPractice), event-driven updates, và các quy tắc trong `NESTJS-STANDARD.md`.

```markdown
# Statistics Module – Spackie English

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Redis (cache), EventEmitter (lắng nghe các event từ StudyModule, ListeningModule).

## Mục tiêu

- Cung cấp API lấy các chỉ số thống kê học tập của user:
  - Tổng số thẻ đã học (`totalCardsLearned`).
  - Streak hiện tại và dài nhất (`currentStreak`, `longestStreak`).
  - Số thẻ đã học hôm nay, số thẻ cần ôn hôm nay (due cards).
  - Biểu đồ hoạt động theo ngày (số lượng review mỗi ngày trong 30 ngày qua).
  - Thống kê chi tiết cho từng deck (số thẻ đã học, tỷ lệ nhớ).
- Cập nhật các chỉ số denormalized trên `User` (totalCardsLearned, streak) thông qua event listener (khi có `card.reviewed` từ StudyModule).
- Cache các kết quả thống kê (TTL phù hợp) để tránh tính toán lại nhiều lần.
- Admin có thể xem thống kê tổng thể (toàn hệ thống).

## Endpoints

| Method | Path                         | Mô tả                                                                         | Role truy cập   |
| ------ | ---------------------------- | ----------------------------------------------------------------------------- | --------------- |
| GET    | `/statistics/overview`       | Lấy tổng quan: totalLearned, streak, hôm nay đã học, due hôm nay              | `USER`, `ADMIN` |
| GET    | `/statistics/daily-activity` | Biểu đồ số lượng review mỗi ngày (30 ngày)                                    | `USER`, `ADMIN` |
| GET    | `/statistics/decks`          | Thống kê theo từng deck (tổng số thẻ, đã học, % nhớ)                          | `USER`, `ADMIN` |
| GET    | `/statistics/listening`      | Thống kê luyện nghe: tổng số lần tập, điểm trung bình, biểu đồ điểm theo ngày | `USER`, `ADMIN` |
| GET    | `/admin/statistics/system`   | (Admin) Thống kê toàn hệ thống: tổng user, total reviews, active users...     | `ADMIN`         |

## DTOs

### OverviewStatisticsDto
```typescript
import { Expose } from 'class-transformer';

export class OverviewStatisticsDto {
  @Expose()
  totalCardsLearned: number;

  @Expose()
  currentStreak: number;

  @Expose()
  longestStreak: number;

  @Expose()
  studiedToday: number;      // số thẻ đã review hôm nay (bất kể rating)

  @Expose()
  dueToday: number;          // số thẻ cần ôn hôm nay (dueDate <= now)

  @Expose()
  lastStudiedAt?: Date;
}
```

### DailyActivityDto
```typescript
export class DailyActivityDto {
  date: string;   // YYYY-MM-DD
  count: number;  // số lượng review trong ngày
}
```

### DeckStatisticsDto
```typescript
export class DeckStatisticsDto {
  deckId: string;
  deckTitle: string;
  totalCards: number;
  learnedCards: number;     // số thẻ đã từng review (reviewCount > 0)
  masteredCards: number;    // số thẻ có interval >= 21 ngày (tuỳ định nghĩa)
  retentionRate: number;    // tỷ lệ nhớ (good/easy trên tổng review) – có thể tính từ recentReviews
}
```

### ListeningStatisticsDto
```typescript
export class ListeningStatisticsDto {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  dailyScores: Array<{ date: string; averageScore: number; attempts: number }>;
}
```

## Use Cases

### 1. `GET /statistics/overview` – Tổng quan

| **Tên**            | Lấy các chỉ số chính của user                                                                                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Trả về totalCardsLearned, streak, studiedToday, dueToday.                                                                                                                                                                                                                                 |
| **Tiền điều kiện** | User đã đăng nhập.                                                                                                                                                                                                                                                                        |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                                                                                                                                                                                                                                   |
| **Luồng chính**    | 1. Lấy userId từ token.<br>2. Lấy user từ DB (có cache) để lấy denormalized fields.<br>3. Tính `studiedToday`: đếm `CardProgress` có `lastReviewAt >= today`.<br>4. Tính `dueToday`: đếm `CardProgress` có `dueDate <= now` và `userId`.<br>5. Cache kết quả (TTL 60s).<br>6. Trả về DTO. |

### 2. `GET /statistics/daily-activity` – Biểu đồ hoạt động 30 ngày

| **Tên**            | Lấy số lượng review theo ngày trong 30 ngày qua                                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Aggregate `CardProgress.reviewCount` theo ngày (dùng `lastReviewAt`).                                                                                                                                                                   |
| **Tiền điều kiện** | User đã đăng nhập.                                                                                                                                                                                                                      |
| **Luồng chính**    | 1. Lấy userId.<br>2. Query `CardProgress` với `lastReviewAt >= 30 ngày trước`.<br>3. Group by date (dùng aggregation pipeline trong MongoDB hoặc tính trong code).<br>4. Cache kết quả (TTL 300s).<br>5. Trả về mảng `{ date, count }`. |

### 3. `GET /statistics/decks` – Thống kê theo deck

| **Tên**            | Xem tiến độ học tập theo từng deck                                       |
| ------------------ | ------------------------------------------------------------------------ |
| **Mô tả**          | Với mỗi deck của user, tính số thẻ đã học, số thẻ thành thạo, tỷ lệ nhớ. |
| **Tiền điều kiện** | User đã đăng nhập.                                                       |
| **Luồng chính**    | 1. Lấy tất cả deck của user.<br>2. Với mỗi deck, tính:                   |
      - `learnedCards`: đếm `CardProgress` có `reviewCount > 0` và card thuộc deck.
      - `masteredCards`: đếm `CardProgress` có `interval >= 21` (hoặc `easeFactor >= 2.5`...).
      - `retentionRate`: tỷ lệ `good/easy` trên tổng review gần đây (có thể lấy từ `recentReviews`).<br>3. Cache kết quả (TTL 120s).<br>4. Trả về danh sách. |

### 4. `GET /statistics/listening` – Thống kê luyện nghe

| **Tên**            | Xem tổng quan luyện nghe                                               |
| ------------------ | ---------------------------------------------------------------------- |
| **Mô tả**          | Lấy totalAttempts, averageScore, bestScore, và biểu đồ điểm theo ngày. |
| **Tiền điều kiện** | User đã đăng nhập.                                                     |
| **Luồng chính**    | 1. Lấy userId.<br>2. Aggregate từ `ListeningPractice`:                 |
      - `totalAttempts`: count.
      - `averageScore`: avg(score).
      - `bestScore`: max(score).
      - `dailyScores`: group by date, tính avg score và attempts.<br>3. Cache (TTL 300s). |

### 5. `GET /admin/statistics/system` – Thống kê toàn hệ thống (Admin)

| **Tên**            | Xem thống kê tổng thể                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Số lượng user active, total reviews, total payments, active subscriptions.                                                                                                      |
| **Tiền điều kiện** | Role `ADMIN`.                                                                                                                                                                   |
| **Luồng chính**    | 1. Đếm user (isActive, không bị ban).<br>2. Tổng số reviews (từ `CardProgress`).<br>3. Số payments thành công trong tháng.<br>4. Số subscriptions active.<br>5. Cache TTL 600s. |

## Event Listeners – Cập nhật denormalized fields

Khi StudyModule emit `card.reviewed`, StatisticsModule lắng nghe và cập nhật `User` stats (totalCardsLearned, streak, lastStudiedAt). Các bước:

1. Nhận event `card.reviewed` với payload `{ userId, cardId, rating, newDueDate }`.
2. Kiểm tra xem user đã từng học card này chưa (dựa trên `reviewCount` cũ). Nếu `reviewCount === 1` và rating != AGAIN → tăng `totalCardsLearned`.
3. Cập nhật streak:
   - Lấy `lastStudiedAt` hiện tại của user.
   - So sánh với ngày hôm nay: nếu hôm qua → tăng streak; nếu hôm nay → giữ nguyên; nếu xa hơn → reset streak = 1.
   - Cập nhật `longestStreak` nếu cần.
4. Cập nhật `lastStudiedAt = now`.
5. Lưu user (có thể dùng repository).
6. Xoá cache `statistics:overview:{userId}`.

**Lưu ý**: Không nên cập nhật denormalized fields trong transaction (vì MongoDB free tier không hỗ trợ). Chấp nhận sai lệch tạm thời, có thể reconcile bằng cron job.

## Cache Strategy

| Key pattern                     | TTL  | Invalidation trigger                                                             |
| ------------------------------- | ---- | -------------------------------------------------------------------------------- |
| `statistics:overview:{userId}`  | 60s  | `card.reviewed` event (update streak, totalLearned)                              |
| `statistics:daily:{userId}`     | 300s | Không cần invalidate thường xuyên (chỉ tính từ data có sẵn)                      |
| `statistics:decks:{userId}`     | 120s | Khi có thay đổi trong deck hoặc card progress (có thể emit event `deck.updated`) |
| `statistics:listening:{userId}` | 300s | Khi có `listening.completed` event                                               |
| `statistics:system` (admin)     | 600s | Cron job hoặc event `payment.succeeded`, `user.registered`                       |

**Invalidation pattern**:
```typescript
await this.cacheManager.del(`statistics:overview:${userId}`);
await this.cacheManager.del(`statistics:decks:${userId}`);
await this.cacheManager.del(`statistics:listening:${userId}`);
```

## Repository & Service

### StatisticsRepository
```typescript
async countStudiedToday(userId: string): Promise<number> { ... }
async countDueToday(userId: string): Promise<number> { ... }
async getDailyActivity(userId: string, days: number): Promise<{ date: string; count: number }[]> { ... }
async getDeckStats(userId: string): Promise<any[]> { ... }
async getListeningStats(userId: string): Promise<any> { ... }
async getSystemStats(): Promise<any> { ... }
```

### StatisticsService
```typescript
@Injectable()
export class StatisticsService {
  async getOverview(userId: string): Promise<OverviewStatisticsDto> { ... }
  async getDailyActivity(userId: string): Promise<DailyActivityDto[]> { ... }
  async getDeckStatistics(userId: string): Promise<DeckStatisticsDto[]> { ... }
  async getListeningStatistics(userId: string): Promise<ListeningStatisticsDto> { ... }
  async getSystemStatistics(): Promise<any> { ... }

  // Event listener
  @OnEvent('card.reviewed')
  async handleCardReviewed(payload: { userId: string; cardId: string; rating: string; reviewCount: number }) {
    await this.updateUserStats(payload.userId, payload.rating, payload.reviewCount);
    await this.cacheManager.del(`statistics:overview:${payload.userId}`);
    await this.cacheManager.del(`statistics:decks:${payload.userId}`);
  }

  @OnEvent('listening.completed')
  async handleListeningCompleted(payload: { userId: string; cardId: string; score: number }) {
    await this.cacheManager.del(`statistics:listening:${payload.userId}`);
  }
}
```

## Event Emission từ các module khác

- **StudyModule** phải emit `card.reviewed` với `reviewCount` (số lần review trước khi cập nhật) để StatisticsModule biết có phải lần đầu hay không.
- **ListeningModule** emit `listening.completed` để invalidate cache listening stats.

## Security & Validation

- Chỉ user mới xem được stats của chính mình (dùng `userId` từ token). Admin có thể xem stats của user khác qua endpoint `/admin/statistics/user/:userId` (nếu cần).
- Rate limiting cho các endpoint thống kê (20 request/phút) để tránh abuse.
- Cache TTL hợp lý, tránh stale data nhưng vẫn đảm bảo performance.

## Cron Job – Reconcile denormalized stats (tuỳ chọn)

Chạy mỗi đêm để đồng bộ `totalCardsLearned`, `streak` nếu có sai lệch do mất event:
```typescript
@Cron(CronExpression.EVERY_DAY_AT_3AM)
async reconcileUserStats() {
  // Tính toán lại totalCardsLearned và streak từ CardProgress, cập nhật User
}
```

## Kết luận

- **StatisticsModule** cung cấp các endpoint thống kê học tập chi tiết, tận dụng cache và event-driven updates.
- Cập nhật denormalized fields trên User để truy vấn nhanh.
- Dễ dàng mở rộng thêm các chỉ số mới (ví dụ: thời gian học, điểm trung bình theo deck).

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này thành `__DOCS/STATISTICS_MODULE.md`. Tài liệu đã hoàn chỉnh, bao gồm các endpoint, DTOs, cache, event listeners, và cron job reconcile.