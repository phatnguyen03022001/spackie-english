# Infrastructure Rules

> Derived from `NESTJS-STANDARD.md`  
> Scope: `src/infrastructure/*`

## Mục tiêu

`infrastructure/` chứa external integrations và technical adapters như Redis, WebSocket, mail, storage, payment, third-party APIs.

## Quy tắc bắt buộc

- `MUST` xem `infrastructure/` là lớp adapter, không phải nơi chứa business rule.
- `MUST` đóng gói từng integration thành module/service rõ ràng.
- `MUST` chuẩn hóa timeout, retry, error mapping cho external calls quan trọng.
- `SHOULD` dùng circuit breaker cho external call quan trọng hoặc hay lỗi.
- `MUST` log requestId/correlationId khi gọi hệ thống ngoài nếu có thể.
- `MUST` tách interface contract và implementation khi dependency có thể đổi nhà cung cấp.
- `MUST` có health check riêng cho integration quan trọng như Redis, storage, mail, payment callback dependency.
- `MUST` có strategy test bằng mock/stub/fake cho integration.
- `MUST` có rate limiting, queue, hoặc backpressure khi gọi third-party API có quota.
- `SHOULD` gom provider theo domain kỹ thuật: `redis`, `mail`, `storage`, `payment`, `ws`, `third-party`.

## Cấu trúc gợi ý

```text
src/infrastructure/
├── redis/
├── ws/
├── mail/
├── storage/
├── payment/
└── third-party/
```

## Quy tắc theo loại integration

- `redis/`: cache, lock, throttle storage, pub/sub; không nhét business flow ở đây
- `ws/`: gateway, adapter, auth socket, room policy
- `mail/`: mail provider, template adapter, delivery abstraction
- `storage/`: upload/delete/sign URL, không xử lý business ownership
- `payment/`: client SDK wrapper, webhook verify, error normalization
- `third-party/`: API client, mapper, retry/backoff, circuit-breaker nếu cần

## Testing

- `SHOULD` mock HTTP integration bằng `nock`, `msw`, fake adapter, hoặc test container tùy loại dependency.
- `MAY` chạy integration test thật với sandbox provider nếu API có môi trường test ổn định.
- `MUST` không để unit test phụ thuộc mạng thật.

## Anti-pattern bị cấm

- Business module gọi SDK raw khắp nơi thay vì qua adapter tập trung.
- Để provider trả lỗi raw từ vendor lên thẳng controller.
- Dùng `infrastructure/` làm nơi chứa service “linh tinh”.

## Checklist review

- Adapter này có thuần technical không?
- Có normalize lỗi và timeout chưa?
- Có đang lộ vendor-specific detail sang business layer không?
- Integration đã có health check riêng chưa?
- Đã có fallback hoặc circuit breaker cho trường hợp lỗi chưa?
