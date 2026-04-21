# Modules Rules

> Derived from `NESTJS-STANDARD.md`  
> Scope: `src/modules/*`

## Mục tiêu

`modules/` chứa toàn bộ business theo feature/domain như `users`, `auth`, `orders`, `payments`.

## Quy tắc bắt buộc

- `MUST` tổ chức theo domain, không tổ chức root-level theo `controllers/`, `services/`, `repositories/`.
- `MUST` đặt controller, service, repository, dto, mapper, use-case gần nhau trong cùng module.
- `MUST` giữ business logic trong `service` hoặc `use-case`.
- `MUST NOT` để controller chứa business rule, query DB, transaction, hoặc mapping phức tạp.
- `MUST NOT` để repository chứa permission rule hoặc orchestration nhiều bước.
- `MUST` đặt validation nghiệp vụ phức tạp ở service/use-case; không dùng custom validator gọi DB làm nơi chứa business rule.
- `MUST` return Response DTO, không return raw Prisma model/entity.
- `MUST` mở transaction ở service/use-case, không mở ở controller hoặc repository.
- `MUST` gọi module khác qua boundary rõ ràng; tránh circular dependency.
- `SHOULD` ưu tiên EventEmitter hoặc queue khi module cần phản ứng với module khác.
- `SHOULD` tách `use-cases/` khi flow có nhiều bước, nhiều service, transaction, hoặc side effect.
- `SHOULD` thêm `mappers/` khi mapping không còn trivial.

## Cấu trúc gợi ý

```text
src/modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── users.repository.ts
├── dto/
├── mappers/
├── use-cases/
└── graphql/
```

## Anti-pattern bị cấm

- Gọi `prisma.*` trực tiếp trong controller hoặc guard.
- Import chéo 2 module rồi vá bằng `forwardRef()` nếu chưa phân lại boundary.
- Nhét business logic vào decorator, pipe, interceptor chỉ để “đỡ viết service”.
- Để gateway/job thao tác thẳng repository mà bỏ qua service business.

## Testing

- `MUST` có unit test cho service/use-case quan trọng.
- `SHOULD` có e2e test cho flow chính của module.
- `SHOULD` mock repository ở unit test service để test business rule độc lập.
- `MAY` dùng fixture/factory để giảm lặp dữ liệu test.

## Module communication

- Nếu module cần lắng nghe hành vi từ module khác, `SHOULD` dùng EventEmitter hoặc queue thay vì gọi service trực tiếp.
- Chỉ gọi service trực tiếp khi dependency một chiều thực sự rõ ràng và không gây circular.
- Event listener vẫn phải mỏng; logic tiếp tục nằm trong service/use-case của module nhận event.

## Checklist review

- Module có boundary rõ chưa?
- Controller có mỏng chưa?
- Business rule có nằm trong service/use-case chưa?
- DTO/response có tránh leak field nhạy cảm chưa?
- Transaction và side effect có tách đúng chưa?
- Module có unit test coverage ≥ 80% chưa?
- Nếu module giao tiếp với module khác, có dùng event/queue để tránh circular không?
