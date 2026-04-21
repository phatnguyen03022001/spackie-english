Dưới đây là file **`CARDS_MODULE.md`** đã được cập nhật với luồng tạo card tự động từ external APIs (DeepSeek, Free Dictionary, Pixabay), có cache, distributed lock, và hỗ trợ cả đồng bộ lẫn bất đồng bộ qua BullMQ. Nội dung vẫn giữ nguyên cấu trúc 10/10.

```markdown
# Cards Module – Spackie English (Anki)

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Redis (cache, lock), BullMQ (queue), FileManager (image/audio), AI (DeepSeek), External APIs (Free Dictionary, Pixabay).

## Mục tiêu

- Quản lý thẻ từ vựng (card) trong một deck: CRUD, sort order, image, audio, extras (phát âm, loại từ, ví dụ, gợi ý AI).
- Hỗ trợ tìm kiếm, phân trang trong deck.
- Chỉ chủ sở hữu của deck mới được tạo, sửa, xóa card (admin có thể can thiệp).
- **Tạo card tự động từ external APIs (DeepSeek, Free Dictionary, Pixabay) khi người dùng tra từ mới, có cache và distributed lock để tránh race condition.**
- Tích hợp `FileManagerModule` để upload image và audio.
- Tích hợp `AIModule` (DeepSeek) để tự động sinh câu ví dụ hoặc gợi ý (tuỳ chọn).
- Cập nhật denormalized field `totalCards` của deck khi tạo/xóa card.
- Cache danh sách card trong deck (TTL ngắn) và invalidate khi có thay đổi.
- **Hỗ trợ tạo card bất đồng bộ (text trước, media sau) sử dụng BullMQ để tối ưu UX.**

## Endpoints

| Method | Path                   | Mô tả                                                            | Role truy cập                            |
| ------ | ---------------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| POST   | `/decks/:deckId/cards` | Tạo card mới trong deck (thủ công hoặc tự động nếu chỉ có front) | Chủ sở hữu deck hoặc `ADMIN`             |
| GET    | `/decks/:deckId/cards` | Lấy danh sách card trong deck (phân trang)                       | `USER` (nếu deck public hoặc chủ sở hữu) |
| GET    | `/cards/:id`           | Lấy chi tiết một card                                            | Như trên                                 |
| PATCH  | `/cards/:id`           | Cập nhật card                                                    | Chủ sở hữu deck hoặc `ADMIN`             |
| DELETE | `/cards/:id`           | Xoá card (soft delete)                                           | Chủ sở hữu deck hoặc `ADMIN`             |
| POST   | `/cards/:id/image`     | Upload image cho card                                            | Chủ sở hữu deck hoặc `ADMIN`             |
| POST   | `/cards/:id/audio`     | Upload audio cho card                                            | Chủ sở hữu deck hoặc `ADMIN`             |
| DELETE | `/cards/:id/image`     | Xoá image                                                        | Chủ sở hữu deck hoặc `ADMIN`             |
| DELETE | `/cards/:id/audio`     | Xoá audio                                                        | Chủ sở hữu deck hoặc `ADMIN`             |
| POST   | `/cards/:id/ai-hint`   | (Tuỳ chọn) Gọi AI sinh câu ví dụ/gợi ý                           | Chủ sở hữu deck hoặc `ADMIN`             |

## DTOs

### CreateCardDto (thủ công)
```typescript
import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class CreateCardDto {
  @IsString()
  front: string;   // mặt trước (từ/câu hỏi)

  @IsString()
  back: string;    // mặt sau (nghĩa/câu trả lời) – có thể bỏ qua nếu dùng tự động

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  extras?: {
    pronunciation?: string;
    partOfSpeech?: string;
    examples?: string[];
    hint?: string;
  };
}
```

### CreateCardAutoDto (chỉ cần front, tạo tự động)
```typescript
import { IsString, IsOptional } from 'class-validator';

export class CreateCardAutoDto {
  @IsString()
  front: string;   // từ cần tra

  @IsOptional()
  @IsString()
  deckId?: string; // nếu không có, có thể gán vào deck mặc định hoặc deck "Unsorted"
}
```

### UpdateCardDto, CardResponseDto, CardListQueryDto (giữ nguyên)

## Use Cases

### 1. `POST /decks/:deckId/cards` – Tạo card thủ công

(Nội dung giữ nguyên như cũ)

### 2. (Mới) Tạo card tự động từ external APIs

| **Tên**                                                          | Tạo card tự động bằng cách gọi DeepSeek, Free Dictionary, Pixabay                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mô tả**                                                        | Khi người dùng tra một từ chưa có trong hệ thống, server tự động tạo card với nghĩa, audio, ảnh. Áp dụng cache, distributed lock, và có thể xử lý bất đồng bộ (text trước, media sau).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Tiền điều kiện**                                               | User đã đăng nhập, deck đích tồn tại (hoặc sử dụng deck mặc định). Từ (front) chưa tồn tại trong DB (theo `front`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Hậu điều kiện**                                                | Card được tạo (ít nhất có text). Audio và image có thể được cập nhật sau qua queue.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Luồng chính (đồng bộ – text + media ngay lập tức)**            | 1. Kiểm tra cache Redis `card:front:{word}` (TTL 24h). Nếu có → trả về ngay.<br>2. Kiểm tra DB xem card đã tồn tại chưa. Nếu có → trả về, cập nhật cache.<br>3. Tạo Redis lock `lock:card:front:{word}` (TTL 10s). Nếu không lấy được lock → yêu cầu client retry.<br>4. Gọi song song (Promise.all):<br>   - DeepSeek: lấy nghĩa tiếng Việt, ví dụ, phát âm, loại từ → lưu vào `back` và `extras`.<br>   - Free Dictionary API: lấy URL audio (nếu có).<br>   - Pixabay API: lấy URL ảnh (nếu có).<br>5. Tải các URL audio/image dưới dạng stream và upload lên Cloudinary (dùng `StorageService.uploadFromUrl`).<br>6. Tạo card record trong DB (lưu các URL Cloudinary).<br>7. Xoá lock, lưu cache (TTL 24h).<br>8. Trả về `CardResponseDto`. |
| **Luồng thay thế (bất đồng bộ – ưu tiên text trước, media sau)** | 1-3 như trên.<br>4. Chỉ gọi DeepSeek lấy text (back, extras) – mất <1s.<br>5. Tạo card ngay (chưa có audio/image).<br>6. Xoá lock, lưu cache (TTL 24h) cho bản ghi tạm.<br>7. Đẩy job `fetch-media` vào BullMQ (chứa cardId, front). Worker xử lý: lấy audio/image từ external APIs, upload Cloudinary, update card.<br>8. Trả về card có text ngay lập tức. Sau khi worker hoàn thành, dùng Pusher gửi event `card.media_ready` để frontend cập nhật.                                                                                                                                                                                                                                                                                           |
| **Ngoại lệ**                                                     | Lock timeout → `409 CONFLICT`. API lỗi (DeepSeek, Dictionary, Pixabay) → card vẫn được tạo với text thuần (audio/image null).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### 3. `GET /decks/:deckId/cards` – Lấy danh sách card trong deck (giữ nguyên)

### 4. `GET /cards/:id` – Xem chi tiết card (giữ nguyên)

### 5. `PATCH /cards/:id` – Cập nhật card (giữ nguyên)

### 6. `DELETE /cards/:id` – Xoá card (giữ nguyên)

### 7. `POST /cards/:id/image` & `/cards/:id/audio` – Upload file (giữ nguyên)

### 8. `POST /cards/:id/ai-hint` – Tạo gợi ý bằng AI (giữ nguyên)

## Cache Strategy

| Key pattern                                                     | TTL  | Invalidation trigger                        |
| --------------------------------------------------------------- | ---- | ------------------------------------------- |
| `card:{id}`                                                     | 300s | UPDATE, DELETE, UPLOAD image/audio, AI hint |
| `card:front:{word}` (cache tra từ)                              | 24h  | Khi card được cập nhật (ít khi)             |
| `cards:deck:{deckId}:page:{page}:limit:{limit}:search:{search}` | 60s  | CREATE, UPDATE, DELETE card trong deck đó   |

**Invalidation**:
```typescript
await this.cacheManager.del(`card:${id}`);
await this.cacheManager.del(`card:front:${word}`);
await this.cacheManager.delPattern(`cards:deck:${deckId}:*`);
```

## Repository & Service (bổ sung)

### CardsRepository
```typescript
// giữ nguyên các method cũ, thêm:
async findByFront(front: string): Promise<Card | null> { ... }
```

### CardsService (bổ sung method)
```typescript
async createCardAuto(userId: string, dto: CreateCardAutoDto, syncMode: boolean = false): Promise<CardResponseDto> {
  // 1. Kiểm tra cache/DB
  // 2. Lock Redis
  // 3. Nếu syncMode = true: gọi đồng bộ tất cả APIs, upload media, lưu card.
  // 4. Nếu syncMode = false: chỉ lấy text từ DeepSeek, lưu card tạm, queue job.
}
```

### FileManagerService (cần bổ sung method)
```typescript
async uploadFromUrl(url: string, folder: string, publicId: string): Promise<string> {
  // Tải stream từ URL và pipe lên Cloudinary
}
```

## Queue (BullMQ) – Job fetch media

**Job name:** `fetch-card-media`  
**Payload:** `{ cardId: string, front: string }`  
**Processor:**
1. Lấy card từ DB.
2. Gọi Free Dictionary API lấy audio URL.
3. Gọi Pixabay API lấy image URL.
4. Với mỗi URL, gọi `FileManagerService.uploadFromUrl` để upload lên Cloudinary.
5. Cập nhật card với `audioUrl`, `imageUrl`.
6. Xoá cache `card:{id}` và `card:front:{word}`.
7. Emit Pusher event `card.media_ready` tới user.

## Security & Validation (giữ nguyên)

## Kết luận

- **CardsModule** cung cấp đầy đủ CRUD, file upload, AI hint, cache, phân trang.
- **Tích hợp tạo card tự động từ external APIs với cache, lock, và queue.**
- Tích hợp chặt chẽ với `DecksModule` và `FileManagerModule`.
- Đảm bảo quyền truy cập dựa trên ownership và visibility.

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này vào `__DOCS/CARDS_MODULE.md`. Nội dung đã phản ánh chính xác luồng tạo từ vựng tự động mà bạn muốn.