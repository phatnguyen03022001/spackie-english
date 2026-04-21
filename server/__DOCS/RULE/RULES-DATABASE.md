# Database Rules

> Derived from `NESTJS-STANDARD.md`  
> Scope: `src/database/*` và phần truy cập DB trong modules

## Mục tiêu

`database/` chứa Prisma bootstrap, migrations, seed, và thành phần hạ tầng DB chung.

## Quy tắc bắt buộc

- `MUST` dùng repository làm boundary truy cập dữ liệu từ module business.
- `MUST` giữ `PrismaService` hoặc DB client ở lớp infrastructure/database, không rải khắp app.
- `MUST` mở transaction ở service/use-case.
- `MUST NOT` gọi external side effect trong transaction.
- `MUST` index các field filter/sort quan trọng.
- `MUST` tính đến connection pool theo DB tier và số instance.
- `MUST` tách schema migration và data migration khi thay đổi lớn.
- `MUST` test migration phức tạp trên staging trước production.
- `SHOULD` có retry policy cho transient DB fault như timeout ngắn, connection reset, deadlock retryable.
- `MAY` cân nhắc read replica / read-write splitting khi workload đọc lớn và consistency cho phép.
- `MUST` đảm bảo chỉ một tiến trình chạy migration production tại một thời điểm.
- `SHOULD` dùng soft delete có chủ đích và document unique constraint impact.

## Cấu trúc gợi ý

```text
src/database/
├── prisma.service.ts
├── migrations/
└── seed/
```

## Quy tắc Prisma

- Production dùng `prisma migrate deploy`.
- Local/dev mới dùng `prisma migrate dev`.
- Seed staging/test tách khỏi production seed.
- Migration lớn đi theo nhiều bước: add field -> backfill -> switch traffic -> cleanup.
- Không để nhiều instance cùng tự chạy migration nếu chưa có guard/lock ở bước deploy.

## Retry & replica notes

- Retry chỉ áp dụng cho lỗi tạm thời, không retry vô điều kiện với lỗi logic hoặc unique violation.
- Nếu dùng read replica, `MUST` document rõ query nào được phép đọc eventual consistency.
- Không route read-after-write critical flow sang replica nếu chưa chấp nhận stale data.

## Anti-pattern bị cấm

- Query DB trực tiếp trong controller, guard, gateway.
- Dùng transaction lồng nhau không cần thiết.
- Chạy `KEYS`, full scan, hoặc query nặng trong hot path mà không cân nhắc index/pagination.

## Checklist review

- Boundary repository đã rõ chưa?
- Transaction mở đúng tầng chưa?
- Query nóng đã có index chưa?
- Migration có rollback hoặc roll-forward plan chưa?
- Các query nóng đã được `EXPLAIN` hoặc `EXPLAIN ANALYZE` và có index phù hợp chưa?
