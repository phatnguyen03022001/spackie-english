# Jobs Rules

> Derived from `NESTJS-STANDARD.md`  
> Scope: `src/jobs/*`

## Mục tiêu

`jobs/` chứa background jobs, queue processors, schedulers, cron tasks.

## Quy tắc bắt buộc

- `MUST` dùng jobs cho tác vụ nặng hoặc chậm: email, export, media processing, sync ngoài hệ thống.
- `MUST NOT` nhét business logic cốt lõi vào processor; processor chỉ orchestration và gọi service/module phù hợp.
- `MUST` cấu hình retry, backoff, remove policy, timeout cho job quan trọng.
- `MUST` log job id, payload tối thiểu an toàn, attempts, duration.
- `MUST` có strategy xử lý failed job và poison message.
- `MUST` có dead-letter queue hoặc cơ chế tương đương cho job fail vượt ngưỡng retry.
- `MUST` đảm bảo idempotency cho job có thể chạy lại.
- `MUST` kiểm soát concurrency để tránh race condition khi nhiều worker cùng xử lý.
- `SHOULD` tách queue theo domain hoặc workload.
- `SHOULD` dùng Redis/Bull adapter phù hợp nếu chạy nhiều worker.
- `MAY` dùng job chain/dependency nếu flow async có nhiều bước, nhưng phải rõ ràng về retry và bù lỗi.

## Cấu trúc gợi ý

```text
src/jobs/
├── jobs.module.ts
├── processors/
├── schedulers/
└── queues/
```

## Cron rules

- Cron chỉ dành cho tác vụ định kỳ rõ ràng.
- Cron phải có lock hoặc guard nếu có nguy cơ chạy trùng nhiều instance.
- Cleanup/sync job phải có observability và alert nếu fail liên tục.

## DLQ & replay

- DLQ phải có dashboard hoặc alert để team biết job đang bị kẹt.
- Poison message phải được đánh dấu, tách khỏi queue chính, và có quy trình xử lý tay.
- Replay job từ DLQ phải an toàn, có idempotency key hoặc guard tương đương.

## Anti-pattern bị cấm

- Processor thao tác thẳng DB bỏ qua service business.
- Đẩy toàn bộ request flow vào queue để né timeout mà không có contract rõ.
- Job payload mang dữ liệu nhạy cảm quá mức cần thiết.

## Checklist review

- Job này có thật sự nên async không?
- Processor có chỉ orchestration không?
- Retry/idempotency/alert đã có chưa?
- Job đã được thiết kế idempotent chưa? Có cơ chế replay an toàn không?
- Dead-letter queue và alert đã sẵn sàng chưa?
