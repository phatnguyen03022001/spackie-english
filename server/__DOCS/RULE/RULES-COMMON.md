# Common Rules

> Derived from `NESTJS-STANDARD.md`  
> Scope: `src/common/*`

## Mục tiêu

`common/` chỉ chứa shared cross-cutting concern dùng nhiều nơi.

## Quy tắc bắt buộc

- `MUST` chỉ đặt những thứ tái sử dụng thật sự: guards, interceptors, filters, pipes, decorators, constants, helpers nhỏ.
- `MUST NOT` đặt business logic theo domain trong `common/`.
- `MUST` giữ code ở `common/` độc lập với một domain cụ thể.
- `MUST` ưu tiên stateless utility; nếu có dependency thì inject rõ ràng.
- `MUST` để global filter/interceptor/pipe ở đây nếu dùng toàn app.
- `MAY` inject `ConfigService` vào guard/interceptor/filter nếu đó là config dùng chung toàn app.
- `MUST NOT` để code trong `common/` phụ thuộc vào config riêng của một domain cụ thể.
- `SHOULD` giữ helper nhỏ và rõ mục đích; helper lớn nên chuyển về module owner hoặc infrastructure phù hợp.

## Helper nhỏ vs helper quá lớn

Nên có:

- `pagination.util.ts`
- `date-range.util.ts`
- `request-id.util.ts`

Không nên có:

- `user-permission.helper.ts` nếu chỉ phục vụ `users`
- `order-pricing.util.ts` nếu chứa business rule tính giá
- `auth-token-orchestration.util.ts` nếu có flow nhiều bước và gọi Redis/DB

## Testing

- `SHOULD` có unit test riêng cho code trong `common/` nếu logic đủ quan trọng hoặc được dùng rộng.
- `MAY` chỉ test gián tiếp qua app nếu helper quá nhỏ, thuần túy, và rủi ro thấp.
- `MUST` test riêng cho guard/interceptor/filter/pipes có branch logic hoặc policy quan trọng.

## Những gì nên nằm ở đây

- `guards/`
- `interceptors/`
- `filters/`
- `pipes/`
- `decorators/`
- `constants/`
- `types/` hoặc `interfaces/` thật sự dùng chung

## Những gì không nên nằm ở đây

- `users.util.ts`, `orders.helper.ts` nếu chỉ phục vụ một domain
- Repository base chứa business knowledge
- Service gọi mail, redis, payment, storage

## Anti-pattern bị cấm

- Biến `common/` thành “sọt rác” cho code chưa biết để đâu.
- Đặt hàm generic quá mức, đọc không ra owner.
- Thêm helper dùng `any` để vá type nhiều module.

## Checklist review

- Code này có thật sự dùng chung nhiều module không?
- Nó có phụ thuộc domain cụ thể không?
- Nếu bỏ file này vào một module owner, code có rõ hơn không?
- Code này có cần unit test riêng không?
- Nó có dễ dùng chung giữa các module không?
