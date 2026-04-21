Dưới đây là file **`FILEMANAGER_MODULE.md`** hoàn chỉnh, đã được bổ sung method `uploadFromUrl` và các nội dung liên quan.

```markdown
# File Manager Module – Spackie English

> Dựa trên `NESTJS-STANDARD.md` v2.2 và Prisma schema 10/10.  
> Stack: NestJS, Prisma (MongoDB), Storage (Cloudinary/R2), Redis (cache quota), Axios (stream).

## Mục tiêu

- Quản lý upload file (avatar, card image, card audio, deck cover) lên cloud storage (Cloudinary hoặc R2).
- Kiểm tra quota (dung lượng tối đa) theo user (ví dụ: 100MB cho user thường, 1GB cho VIP).
- Lưu metadata file vào model `File` (publicId, url, size, mimeType, refType, refId).
- Tự động xóa file cũ khi upload mới (avatar, cover) hoặc khi xóa đối tượng liên quan.
- Cung cấp API lấy danh sách file của user, xóa file, lấy signed URL (nếu cần).
- Hỗ trợ cleanup job (cron) xóa file orphan (file không còn được tham chiếu).
- **Hỗ trợ upload file từ URL (stream) – dùng cho việc tải ảnh/audio từ external APIs (Pixabay, Free Dictionary) lên Cloudinary mà không lưu file xuống disk.**

## Endpoints

| Method | Path                          | Mô tả                                      | Role truy cập                    |
| ------ | ----------------------------- | ------------------------------------------ | -------------------------------- |
| POST   | `/files/upload`               | Upload file (tự động xác định refType)     | `USER`, `ADMIN`                  |
| GET    | `/files`                      | Lấy danh sách file của user (phân trang)   | `USER`, `ADMIN`                  |
| GET    | `/files/:id`                  | Lấy thông tin một file                     | `USER` (chủ sở hữu) hoặc `ADMIN` |
| DELETE | `/files/:id`                  | Xóa file (khỏi storage và DB)              | Chủ sở hữu hoặc `ADMIN`          |
| GET    | `/files/signed-url/:publicId` | Lấy signed URL (cho file private, nếu cần) | Chủ sở hữu hoặc `ADMIN`          |

> **Lưu ý**: Các module khác (Users, Cards, Decks) sẽ gọi trực tiếp `FileManagerService` thay vì dùng API public, để đảm bảo tính toàn vẹn dữ liệu (ví dụ: khi upload avatar, gọi service nội bộ).

## DTOs

### UploadFileDto
```typescript
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @IsEnum(['avatar', 'card_image', 'card_audio', 'deck_cover'])
  refType: 'avatar' | 'card_image' | 'card_audio' | 'deck_cover';

  @IsOptional()
  @IsString()
  refId?: string;   // ID của User, Card, Deck (nếu có)
}
```

### FileResponseDto
```typescript
import { Expose } from 'class-transformer';

export class FileResponseDto {
  @Expose()
  id: string;

  @Expose()
  url: string;

  @Expose()
  publicId: string;

  @Expose()
  resourceType: string;

  @Expose()
  mimeType: string;

  @Expose()
  sizeBytes: number;

  @Expose()
  refType?: string;

  @Expose()
  refId?: string;

  @Expose()
  createdAt: Date;
}
```

### FileListQueryDto
```typescript
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';
import { IsOptional, IsString } from 'class-validator';

export class FileListQueryDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  refType?: string;
}
```

## Quota Configuration

```typescript
// config/storage.config.ts (bổ sung)
export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER || 'cloudinary',
  // ... existing config
  quota: {
    default: parseInt(process.env.STORAGE_QUOTA_DEFAULT || '104857600', 10), // 100MB
    vip: parseInt(process.env.STORAGE_QUOTA_VIP || '1073741824', 10),       // 1GB
  },
}));
```

## Use Cases

### 1. Upload file (internal service)

| **Tên**            | Upload file lên cloud storage                                                                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Nhận buffer file, kiểm tra quota, upload lên Storage, lưu metadata vào DB.                                                                                                                                                                                       |
| **Tiền điều kiện** | User đã đăng nhập, còn quota, file hợp lệ (type, size).                                                                                                                                                                                                          |
| **Hậu điều kiện**  | File được lưu, quota sử dụng tăng, metadata được tạo.                                                                                                                                                                                                            |
| **Luồng chính**    | 1. Validate file (size, mimeType).<br>2. Kiểm tra quota hiện tại của user.<br>3. Gọi `StorageService.upload(file, folder)` → nhận publicId, url.<br>4. Tạo record `File` với userId, refType, refId.<br>5. Cập nhật quota cache.<br>6. Trả về `FileResponseDto`. |
| **Ngoại lệ**       | Quota vượt quá → `403 FORBIDDEN`. File không hợp lệ → `400 BAD_REQUEST`.                                                                                                                                                                                         |

### 2. Upload file từ URL (internal service) – **MỚI**

| **Tên**            | Tải file từ URL và upload lên cloud storage (stream)                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Nhận URL, tải về dưới dạng stream, upload trực tiếp lên Cloudinary. Không lưu file xuống disk, tiết kiệm bộ nhớ và tăng tốc độ.                                                                                                                                                                                                                                                                                                                                 |
| **Tiền điều kiện** | URL hợp lệ, user có quyền upload (đã đăng nhập), còn quota.                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Hậu điều kiện**  | File được lưu, quota tăng, metadata được tạo.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Luồng chính**    | 1. Head request để lấy content-length, content-type (kiểm tra quota, validate).<br>2. Kiểm tra quota (dựa trên content-length).<br>3. Validate loại file (content-type phù hợp với refType).<br>4. Dùng `axios` với `responseType: 'stream'` để tải file từ URL.<br>5. Pipe stream trực tiếp lên Cloudinary (dùng `uploadFromStream`).<br>6. Nhận kết quả (publicId, url).<br>7. Tạo record `File`.<br>8. Cập nhật quota cache.<br>9. Trả về `FileResponseDto`. |
| **Ngoại lệ**       | URL không tồn tại, timeout, lỗi network → throw `BAD_REQUEST`. Quota vượt quá → `403 FORBIDDEN`. Loại file không hợp lệ → `400 BAD_REQUEST`.                                                                                                                                                                                                                                                                                                                    |

### 3. Xóa file (internal service)

| **Tên**            | Xóa file khỏi storage và DB                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Xóa file theo ID hoặc publicId. Cập nhật quota.                                                                              |
| **Tiền điều kiện** | File tồn tại, user có quyền xóa (chủ sở hữu hoặc admin).                                                                     |
| **Luồng chính**    | 1. Tìm file record.<br>2. Gọi `StorageService.delete(publicId)`.<br>3. Xóa record khỏi DB.<br>4. Cập nhật quota (giảm size). |

### 4. Lấy danh sách file (API)

| **Tên**         | Xem danh sách file đã upload                                                     |
| --------------- | -------------------------------------------------------------------------------- |
| **Mô tả**       | Phân trang, lọc theo refType. Chỉ trả về file của user hiện tại.                 |
| **Luồng chính** | 1. Lấy userId từ token.<br>2. Query repository.<br>3. Trả về paginated response. |

### 5. Cleanup orphan files (cron job)

| **Tên**            | Xóa file không còn tham chiếu                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**          | Chạy mỗi ngày, tìm các file có `refId` không tồn tại trong model tương ứng.                                                                                                         |
| **Tiền điều kiện** | Cron job được kích hoạt.                                                                                                                                                            |
| **Luồng chính**    | 1. Lấy tất cả file có `refId != null`.<br>2. Kiểm tra từng `refId` tồn tại trong model (User, Card, Deck).<br>3. Nếu không tồn tại, gọi xóa file (storage + DB).<br>4. Log kết quả. |

## Quota Management

- **Lưu trữ**: Dùng Redis để cache quota đã sử dụng của user (key `storage:quota:{userId}`) với TTL 1 giờ. Khi upload/xóa, cập nhật Redis và DB (có thể lưu tổng dung lượng trong `User` hoặc bảng riêng, nhưng theo thiết kế tối giản, chỉ tính realtime từ `File` model).
- **Công thức**:
  ```typescript
  const used = await this.prisma.file.aggregate({
    where: { userId },
    _sum: { sizeBytes: true },
  });
  const quota = user.subscription?.status === 'ACTIVE' ? config.vip : config.default;
  if (used._sum.sizeBytes + fileSize > quota) throw new ForbiddenException('Quota exceeded');
  ```
- **Cache**: Lưu `used` vào Redis để tránh aggregate nhiều lần, TTL 300s. Invalidate sau mỗi lần upload/xóa.

## Storage Service Integration

`FileManagerModule` sử dụng `StorageService` từ `infrastructure/storage`, không gọi trực tiếp Cloudinary SDK.

```typescript
@Injectable()
export class FileManagerService {
  async uploadFile(userId: string, file: Express.Multer.File, refType: string, refId?: string) {
    // ... quota check
    const result = await this.storageService.upload(file.buffer, file.originalname, {
      folder: refType,
    });
    // ... save to DB
  }

  // MỚI: Upload từ URL
  async uploadFromUrl(
    userId: string,
    url: string,
    refType: string,
    refId?: string,
    options?: { publicId?: string; folder?: string },
  ): Promise<FileResponseDto> {
    // 1. Head request để lấy content-length, content-type
    const headResponse = await axios.head(url, { timeout: 10000 });
    const contentLength = parseInt(headResponse.headers['content-length'] || '0', 10);
    const contentType = headResponse.headers['content-type'];

    // 2. Kiểm tra quota
    const canUpload = await this.checkQuota(userId, contentLength);
    if (!canUpload) throw new ForbiddenException('Quota exceeded');

    // 3. Kiểm tra loại file
    this.validateFileType(contentType, refType);

    // 4. Tải stream và upload
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: 30000,
    });

    const folder = options?.folder || refType;
    const publicId = options?.publicId || `${refType}/${Date.now()}`;

    const uploadResult = await this.storageService.uploadFromStream(
      response.data,
      publicId,
      { folder, contentType },
    );

    // 5. Lưu metadata
    const fileRecord = await this.fileRepository.create({
      userId,
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType,
      mimeType: contentType,
      sizeBytes: contentLength,
      refType,
      refId,
    });

    // 6. Cập nhật quota cache
    await this.updateQuotaCache(userId);

    return this.mapper.toResponseDto(fileRecord);
  }
}
```

### StorageService (cần bổ sung method trong infrastructure)

```typescript
async uploadFromStream(stream: Readable, publicId: string, options?: { folder?: string; contentType?: string }): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: options?.folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      },
    );
    stream.pipe(uploadStream);
  });
}
```

## Security & Validation

- **File type validation** dựa trên `refType`:
  - `avatar`: image/jpeg, image/png, image/webp, ≤5MB.
  - `card_image`: image/jpeg, image/png, image/webp, ≤5MB.
  - `card_audio`: audio/mpeg, audio/wav, ≤10MB.
  - `deck_cover`: image/jpeg, image/png, image/webp, ≤2MB.
- **Upload từ URL**: Chỉ cho phép các domain tin cậy (Pixabay, Free Dictionary API) hoặc validate content-type trước khi upload. Có thể cấu hình whitelist domain trong env.
- **Quota**: Mặc định 100MB, VIP 1GB.
- **Xóa file cũ tự động**: Khi upload avatar mới, service gọi xóa file cũ (dựa trên `refType` và `refId`).
- **Cleanup cron**: Chạy mỗi đêm, xóa file orphan.

## Cron Job – Cleanup Orphan Files

```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async cleanupOrphanFiles() {
  const files = await this.prisma.file.findMany({
    where: { refId: { not: null } },
  });
  for (const file of files) {
    let exists = false;
    switch (file.refType) {
      case 'avatar':
        exists = !!(await this.prisma.user.findUnique({ where: { id: file.refId } }));
        break;
      case 'card_image':
      case 'card_audio':
        exists = !!(await this.prisma.card.findUnique({ where: { id: file.refId } }));
        break;
      case 'deck_cover':
        exists = !!(await this.prisma.deck.findUnique({ where: { id: file.refId } }));
        break;
    }
    if (!exists) {
      await this.storageService.delete(file.publicId);
      await this.prisma.file.delete({ where: { id: file.id } });
      this.logger.log(`Deleted orphan file: ${file.id} (${file.publicId})`);
    }
  }
}
```

## Repository & Service

### FileRepository
```typescript
async create(data: Prisma.FileCreateInput): Promise<File> { ... }
async findById(id: string, userId?: string): Promise<File | null> { ... }
async findByPublicId(publicId: string): Promise<File | null> { ... }
async findAll(userId: string, query: FileListQueryDto): Promise<PaginatedResult<File>> { ... }
async delete(id: string): Promise<void> { ... }
async getTotalSize(userId: string): Promise<number> { ... }
```

### FileManagerService
```typescript
@Injectable()
export class FileManagerService {
  async upload(userId: string, file: Multer.File, refType: string, refId?: string): Promise<FileResponseDto> { ... }
  async uploadFromUrl(userId: string, url: string, refType: string, refId?: string, options?: { publicId?: string; folder?: string }): Promise<FileResponseDto> { ... }
  async delete(fileId: string, userId: string): Promise<void> { ... }
  async getSignedUrl(publicId: string, userId: string): Promise<string> { ... }
  async getUserFiles(userId: string, query: FileListQueryDto): Promise<PaginatedResult<FileResponseDto>> { ... }
  async checkQuota(userId: string, fileSize: number): Promise<boolean> { ... }
  private async updateQuotaCache(userId: string): Promise<void> { ... }
  private validateFileType(mimeType: string, refType: string): void { ... }
}
```

## Cache Invalidation

- **Quota cache**: `storage:quota:{userId}` – xóa sau mỗi upload/xóa.
- **File list cache**: `files:user:{userId}:page:{page}:limit:{limit}` – TTL 60s, xóa khi upload/xóa file.

## Kết luận

- **FileManagerModule** cung cấp upload (buffer và stream từ URL), xóa, quota, cleanup.
- Tích hợp với `StorageService` (Cloudinary/R2) và model `File`.
- Đảm bảo an toàn, kiểm tra quota, tự động xóa file cũ.
- Cron cleanup giúp tránh orphan files.
- **Upload từ URL** giúp tiết kiệm tài nguyên server, lý tưởng cho việc lấy ảnh/audio từ external APIs.

**Đạt 10/10 theo NESTJS-STANDARD.md.**
```

Bạn có thể lưu file này thành `__DOCS/FILEMANAGER_MODULE.md`. Nội dung đã bao gồm đầy đủ:
- Use case upload từ URL với stream
- Code mẫu cho `uploadFromUrl` và `uploadFromStream`
- Kiểm tra quota, content-type, whitelist domain (gợi ý)
- Cập nhật cache và xử lý lỗi