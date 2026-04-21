# Config Rules

> Derived from `NESTJS-STANDARD.md`  
> Scope: `src/config/*`

## Mục tiêu

`config/` là nơi tập trung config app, env validation, config factory, typed config object.

## Quy tắc bắt buộc

- `MUST` validate env khi app khởi động.
- `MUST` truy cập config qua `ConfigService` hoặc config factory.
- `MUST NOT` đọc `process.env.*` rải rác trong business modules.
- `MUST` nhóm config theo mục đích: `app`, `auth`, `database`, `redis`, `storage`, `mail`.
- `MUST` đặt default value rõ ràng cho biến optional.
- `MUST` fail fast nếu thiếu biến required.
- `SHOULD` map env sang typed object thay vì truyền string raw nhiều nơi.

## Test environment

- `MUST` hỗ trợ override config cho test.
- `SHOULD` dùng `ConfigModule.forRoot({ envFilePath: '.env.test' })` hoặc inject override trực tiếp trong test bootstrap.
- `MAY` ưu tiên biến môi trường runtime để override giá trị test quan trọng thay vì sửa file config.

## Multi-environment & rotation

- `MUST` phân biệt ít nhất `development`, `test`, `staging`, `production`.
- `SHOULD` tách config theo môi trường nhưng giữ cùng schema validation.
- `MUST` có kế hoạch rotation cho secret quan trọng như JWT secret, API key, webhook secret.
- `SHOULD` thiết kế config để có thể hỗ trợ key rotation theo cặp `current` / `previous` nếu cần verify token cũ trong thời gian chuyển tiếp.

## Secrets Management

- `MUST NOT` lưu secret trong file config thuần được commit vào git.
- `SHOULD` dùng secret manager như AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager, hoặc secret store của nền tảng deploy.
- `MAY` dùng biến môi trường của Render/Vercel/Docker/Kubernetes nếu chưa có secret manager chuyên dụng.
- `MUST` audit nơi cấp phát và nơi đọc secret.

## Cấu trúc gợi ý

```text
src/config/
├── app.config.ts
├── auth.config.ts
├── database.config.ts
├── redis.config.ts
├── storage.config.ts
└── validation.schema.ts
```

## Anti-pattern bị cấm

- Hardcode secret, URL, token trong source code.
- Đọc env trực tiếp trong service business.
- Dùng cùng một secret cho access token và refresh token.
- Để config thiếu owner hoặc không validate.

## Checklist review

- Env đã được validate chưa?
- Config đã gom theo nhóm chưa?
- Có chỗ nào business code đang đọc `process.env` trực tiếp không?
- Config có được override cho test không?
- Secret có được lưu trữ an toàn không?
