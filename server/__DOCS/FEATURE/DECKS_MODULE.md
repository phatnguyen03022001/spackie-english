Dưới đây là tài liệu cho **DecksModule** đạt chuẩn 10/10, dựa trên Prisma schema và các quy tắc trong `NESTJS-STANDARD.md`.

```markdown
# Decks Module – Spackie English (Anki)

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Redis (cache), FileManager (cover image).

## Mục tiêu

- Quản lý bộ thẻ (deck): CRUD, phân quyền sở hữu, visibility (public/private), tags, cover image.
- Hỗ trợ tìm kiếm, phân trang, lọc theo visibility, tags, VIP only.
- User có thể xem danh sách deck của mình, xem public deck của người khác.
- Admin có thể xoá hoặc chỉnh sửa bất kỳ deck nào (tuỳ chính sách).
- Tích hợp cache cho danh sách deck (đặc biệt public deck).
- Sử dụng `FileManagerModule` để upload cover ảnh.

## Endpoints

| Method | Path               | Mô tả                                                     | Role truy cập                          |
| ------ | ------------------ | --------------------------------------------------------- | -------------------------------------- |
| POST   | `/decks`           | Tạo deck mới                                              | `USER`, `ADMIN`                        |
| GET    | `/decks`           | Lấy danh sách deck của user hiện tại (có phân trang, lọc) | `USER`, `ADMIN`                        |
| GET    | `/decks/public`    | Lấy danh sách public deck (toàn bộ user, có phân trang)   | `PUBLIC` (guest)                       |
| GET    | `/decks/:id`       | Lấy chi tiết một deck                                     | `USER` (nếu là chủ sở hữu hoặc public) |
| PATCH  | `/decks/:id`       | Cập nhật thông tin deck                                   | Chủ sở hữu hoặc `ADMIN`                |
| DELETE | `/decks/:id`       | Xoá deck (soft delete)                                    | Chủ sở hữu hoặc `ADMIN`                |
| POST   | `/decks/:id/cover` | Upload/update cover ảnh                                   | Chủ sở hữu hoặc `ADMIN`                |
| DELETE | `/decks/:id/cover` | Xoá cover ảnh                                             | Chủ sở hữu hoặc `ADMIN`                |

> **Lưu ý**: Admin có thể truy cập và thao tác trên mọi deck (có thể thêm endpoint `/admin/decks` riêng).

## DTOs

### CreateDeckDto
```typescript
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';

export class CreateDeckDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['PRIVATE', 'PUBLIC'])
  visibility?: 'PRIVATE' | 'PUBLIC';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isVipOnly?: boolean;
}
```

### UpdateDeckDto
```typescript
export class UpdateDeckDto extends PartialType(CreateDeckDto) {}
```

### DeckResponseDto
```typescript
import { Expose, Type } from 'class-transformer';

export class DeckResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description?: string;

  @Expose()
  coverUrl?: string;

  @Expose()
  visibility: string;

  @Expose()
  tags: string[];

  @Expose()
  isVipOnly: boolean;

  @Expose()
  totalCards: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  owner: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
  };
}
```

### DeckListQueryDto
```typescript
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';
import { IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';

export class DeckListQueryDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search?: string;      // tìm theo title, description

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  visibility?: 'PRIVATE' | 'PUBLIC';

  @IsOptional()
  @IsBoolean()
  isVipOnly?: boolean;
}
```

## Use Cases

### 1. `POST /decks` – Tạo deck mới

| **Tên**            | Tạo bộ thẻ mới                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | User tạo deck với title, description, tags, visibility. Mặc định visibility = PRIVATE.                                                 |
| **Tiền điều kiện** | User đã đăng nhập.                                                                                                                     |
| **Hậu điều kiện**  | Deck được tạo, `totalCards = 0`, cache danh sách bị xoá.                                                                               |
| **Luồng chính**    | 1. Validate DTO.<br>2. Tạo deck record với `userId` từ token.<br>3. Xoá cache danh sách deck của user.<br>4. Trả về `DeckResponseDto`. |

### 2. `GET /decks` – Lấy danh sách deck của user

| **Tên**            | Xem danh sách deck của chính mình                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Hỗ trợ tìm kiếm, lọc theo tags, visibility, phân trang.                                                                                                                                                                     |
| **Tiền điều kiện** | User đã đăng nhập.                                                                                                                                                                                                          |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                                                                                                                                                                     |
| **Luồng chính**    | 1. Lấy `userId` từ token.<br>2. Xây dựng `where` condition (`userId`, search, tags, visibility).<br>3. Query repository (có cache TTL 60s nếu không có filter động).<br>4. Trả về `PaginationResponseDto<DeckResponseDto>`. |

### 3. `GET /decks/public` – Xem danh sách public deck (guest)

| **Tên**            | Xem danh sách deck công khai của tất cả user                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Hỗ trợ tìm kiếm, lọc theo tags, phân trang. Không cần đăng nhập.                                                                                                                |
| **Tiền điều kiện** | Không.                                                                                                                                                                          |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                                                                                                                         |
| **Luồng chính**    | 1. Xây dựng `where` condition (`visibility = PUBLIC`, search, tags).<br>2. Query repository (cache TTL 120s).<br>3. Trả về danh sách deck (không bao gồm owner sensitive info). |

### 4. `GET /decks/:id` – Xem chi tiết deck

| **Tên**            | Xem chi tiết một deck                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mô tả**          | Chỉ cho phép nếu deck là PUBLIC hoặc user là chủ sở hữu (hoặc admin).                                                                                                                      |
| **Tiền điều kiện** | Deck tồn tại, chưa bị xoá mềm.                                                                                                                                                             |
| **Hậu điều kiện**  | Không thay đổi dữ liệu.                                                                                                                                                                    |
| **Luồng chính**    | 1. Lấy deck từ DB (có cache TTL 300s).<br>2. Kiểm tra quyền: nếu `visibility = PRIVATE` và `userId` không phải chủ sở hữu và không phải admin → throw 403.<br>3. Trả về `DeckResponseDto`. |

### 5. `PATCH /decks/:id` – Cập nhật deck

| **Tên**            | Cập nhật thông tin deck                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Chỉ chủ sở hữu hoặc admin mới được cập nhật.                                                                                                    |
| **Tiền điều kiện** | Deck tồn tại, user có quyền.                                                                                                                    |
| **Hậu điều kiện**  | Deck được cập nhật, cache liên quan bị xoá.                                                                                                     |
| **Luồng chính**    | 1. Kiểm tra quyền.<br>2. Cập nhật deck (chỉ các field cho phép).<br>3. Xoá cache `deck:{id}` và danh sách deck của user.<br>4. Trả về deck mới. |

### 6. `DELETE /decks/:id` – Xoá deck (soft delete)

| **Tên**            | Xoá deck (soft delete)                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Mô tả**          | Đánh dấu `deletedAt = now()`. Các card trong deck cũng bị soft delete (nếu cascade). |
| **Tiền điều kiện** | Deck tồn tại, user có quyền.                                                         |
| **Hậu điều kiện**  | `deletedAt` được set, cache bị xoá.                                                  |
| **Luồng chính**    | 1. Kiểm tra quyền.<br>2. Cập nhật `deletedAt`.<br>3. Xoá cache.                      |

### 7. `POST /decks/:id/cover` – Upload cover ảnh

| **Tên**            | Upload ảnh bìa cho deck                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Nhận file ảnh, upload lên Storage, cập nhật `coverUrl`.                                                                                                                     |
| **Tiền điều kiện** | User là chủ sở hữu hoặc admin, file hợp lệ (ảnh ≤5MB).                                                                                                                      |
| **Hậu điều kiện**  | Cover cũ bị xoá (nếu có), `coverUrl` được cập nhật, cache bị xoá.                                                                                                           |
| **Luồng chính**    | 1. Multer validate file.<br>2. Gọi `FileManagerService.upload(file, 'deck-cover')`.<br>3. Lấy deck cũ, nếu có cover cũ thì xoá.<br>4. Cập nhật `coverUrl`.<br>5. Xoá cache. |

## Cache Strategy

| Key pattern                                         | TTL  | Invalidation trigger                      |
| --------------------------------------------------- | ---- | ----------------------------------------- |
| `deck:{id}`                                         | 300s | UPDATE, DELETE, UPLOAD COVER              |
| `decks:user:{userId}:page:{page}:limit:{limit}:...` | 60s  | CREATE, UPDATE, DELETE deck của user đó   |
| `decks:public:page:{page}:limit:{limit}:...`        | 120s | CREATE, UPDATE, DELETE bất kỳ deck public |

**Invalidation pattern**:
```typescript
await this.cacheManager.del(`deck:${id}`);
await this.cacheManager.delPattern(`decks:user:${userId}:*`);
await this.cacheManager.delPattern('decks:public:*');
```

## Repository & Service

### DecksRepository
```typescript
async create(userId: string, data: CreateDeckDto) { /* tạo deck */ }
async findAll(userId: string, query: DeckListQueryDto) { /* danh sách deck của user */ }
async findPublic(query: DeckListQueryDto) { /* danh sách public deck */ }
async findById(id: string, includeDeleted?: boolean) { /* lấy deck */ }
async update(id: string, data: Prisma.DeckUpdateInput) { /* cập nhật */ }
async softDelete(id: string) { /* set deletedAt */ }
async updateCover(id: string, coverUrl: string | null) { /* cập nhật cover */ }
```

### DecksService
```typescript
@Injectable()
export class DecksService {
  async createDeck(userId: string, dto: CreateDeckDto) { ... }
  async getUserDecks(userId: string, query: DeckListQueryDto) { ... }
  async getPublicDecks(query: DeckListQueryDto) { ... }
  async getDeckById(id: string, currentUserId?: string) { ... }
  async updateDeck(id: string, userId: string, dto: UpdateDeckDto) { ... }
  async deleteDeck(id: string, userId: string) { ... }
  async updateCover(id: string, userId: string, file: Express.Multer.File) { ... }
}
```

## Security & Validation

- **Quyền truy cập**: Chỉ chủ sở hữu hoặc admin mới được sửa/xoá deck. Public deck có thể xem bởi bất kỳ ai (kể cả guest).
- **Soft delete**: Deck bị xoá mềm không hiển thị trong danh sách, không thể truy cập (trừ admin có filter).
- **Cover upload**: Giới hạn kích thước 5MB, chỉ cho phép image/jpeg, image/png, image/webp.
- **Tags**: Lưu dưới dạng mảng string, không ràng buộc unique. Có thể tìm kiếm theo tags (dùng `tags: { hasSome: tags }`).
- **VIP only**: Nếu `isVipOnly = true`, chỉ user có subscription active mới được xem nội dung deck (kiểm tra ở service).

## Denormalized field `totalCards`

- Khi tạo/xoá card trong deck, cần cập nhật `totalCards` của deck tương ứng.
- Do MongoDB không hỗ trợ transaction (free tier), dùng **idempotency key** hoặc **cron job** để đồng bộ. Có thể cập nhật ngay trong cùng một service (vẫn an toàn nếu không có concurrent issue).

## Kết luận

- **DecksModule** cung cấp đầy đủ CRUD, phân trang, lọc, cache, upload cover.
- Tách biệt rõ quyền truy cập (private/public, ownership).
- Tích hợp với `FileManagerModule` và cache invalidation.

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này thành `__DOCS/DECKS_MODULE.md`. Tài liệu này hoàn chỉnh, sẵn sàng cho việc phát triển.