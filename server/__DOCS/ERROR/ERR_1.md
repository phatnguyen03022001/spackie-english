Dưới đây là danh sách **các file `_module.md` và `env.example.md` cần sửa** để đáp ứng tất cả các yêu cầu trước đó (tạo card tự động từ external APIs, tối ưu Brevo chỉ cho Auth, bổ sung cấu trúc và cache/lock).

---

## 📋 Danh sách file cần sửa

| STT | File                     | Lý do / Thay đổi chính                                                                                                                                   |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `CARDS_MODULE.md`        | Thêm use case tạo card tự động (cache, lock, queue, DeepSeek, Dictionary, Pixabay). Thêm DTO `CreateCardAutoDto`. Bổ sung cache key `card:front:{word}`. |
| 2   | `NOTIFICATION_MODULE.md` | Loại bỏ email khỏi cron reminder hàng ngày, chỉ giữ push notification. Thêm lưu ý về quota email Brevo.                                                  |
| 3   | `AUTH_MODULE.md`         | Thêm mô tả về giới hạn email Brevo (300/ngày), ưu tiên gửi OTP, welcome, payment confirmation. Gợi ý dùng Redis đếm quota.                               |
| 4   | `PAYMENT_MODULE.md`      | Thêm kiểm tra quota email trước khi gửi email xác nhận thanh toán. Nếu hết quota, chỉ log lỗi, không gửi.                                                |
| 5   | `FILEMANAGER_MODULE.md`  | Thêm method `uploadFromUrl` (tải stream từ URL lên Cloudinary) – phục vụ cho việc lấy ảnh/audio từ external APIs.                                        |
| 6   | `ARCHITECTURE-FLOW.md`   | Cập nhật cấu trúc thư mục `cards/` (thêm `services/`, `processors/`, `interfaces/`). Bổ sung cache key `card:front:{word}` trong cache strategy.         |
| 7   | `env.example.md`         | Thêm biến `PIXABAY_API_KEY` (cho Pixabay API).                                                                                                           |

---

## 🔧 Ghi chú chi tiết

### 1. `CARDS_MODULE.md`
- Thêm use case mới (Tạo card tự động) với luồng chi tiết (cache → lock → gọi APIs → upload media → lưu DB → queue).
- Thêm DTO `CreateCardAutoDto`.
- Bổ sung cache key `card:front:{word}` (TTL 24h).
- Thêm mô tả về `RedisLockService` để tránh race condition.

### 2. `NOTIFICATION_MODULE.md`
- Trong cron job `send-reminder`, xoá phần gửi email, chỉ giữ `pushEnabled`.
- Thêm đoạn: *“Do giới hạn email Brevo (300/ngày), reminder chỉ gửi qua push notification. Email chỉ dùng cho OTP, welcome, payment confirmation.”*

### 3. `AUTH_MODULE.md`
- Thêm mục **Email Quota Management**:
  ```markdown
  - Brevo free tier: 300 emails/ngày.
  - Dùng Redis key `email:quota:YYYY-MM-DD` để đếm.
  - Ưu tiên: OTP > welcome > payment confirmation > các loại khác.
  - Nếu vượt 80% (240), chỉ gửi OTP và payment confirmation.
  ```

### 4. `PAYMENT_MODULE.md`
- Trong webhook handler, trước khi gửi email xác nhận, gọi `EmailQuotaService.checkAndIncrement('payment')`. Nếu hết quota, bỏ qua email nhưng vẫn log warning.

### 5. `FILEMANAGER_MODULE.md`
- Thêm method:
  ```typescript
  async uploadFromUrl(url: string, folder: string, publicId: string): Promise<string>
  ```
  - Dùng `axios` với `responseType: 'stream'` pipe lên Cloudinary.
  - Xử lý lỗi, timeout.

### 6. `ARCHITECTURE-FLOW.md`
- Cập nhật cấu trúc `cards/` (như đã đề xuất: thêm `services/`, `processors/`, `interfaces/`).
- Trong bảng cache strategy của `CardsModule`, thêm dòng:
  | `card:front:{word}` | 24h | Khi card được tạo hoặc cập nhật |

### 7. `env.example.md`
- Thêm:
  ```bash
  # Pixabay API (cho ảnh từ vựng)
  PIXABAY_API_KEY=your_pixabay_api_key
  ```

---

## ✅ Kết luận

Sau khi sửa 7 file trên, toàn bộ tài liệu sẽ hoàn chỉnh, nhất quán, và đáp ứng đầy đủ các yêu cầu:
- Tạo card tự động từ external APIs (DeepSeek, Dictionary, Pixabay) với cache, lock, queue.
- Tối ưu email Brevo (chỉ dùng cho Auth và thanh toán).
- Cấu trúc module rõ ràng, tận dụng hết infrastructure.

Bạn có muốn tôi **cung cấp lại nội dung cụ thể của từng file đã sửa** không?