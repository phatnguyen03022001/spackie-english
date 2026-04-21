src/modules/notification/
├── notification.module.ts
├── notification.service.ts
├── notification.controller.ts           # Admin endpoints (gửi broadcast, xem log)
├── dto/
│   ├── send-email.dto.ts
│   ├── send-push.dto.ts
│   ├── notification-preferences.dto.ts
│   └── notification-response.dto.ts
├── mappers/
│   └── notification.mapper.ts
├── use-cases/
│   ├── send-welcome-email.use-case.ts
│   ├── send-lesson-reminder.use-case.ts
│   └── send-broadcast-notification.use-case.ts
├── repositories/
│   └── notification-log.repository.ts
└── interfaces/
    └── notification-channel.interface.ts



  src/modules/file-manager/
├── file-manager.module.ts
├── file-manager.service.ts
├── file-manager.controller.ts           # Upload, delete, get signed URL
├── dto/
│   ├── upload-file.dto.ts
│   ├── file-response.dto.ts
│   └── delete-file.dto.ts
├── mappers/
│   └── file.mapper.ts
├── use-cases/
│   ├── upload-avatar.use-case.ts
│   ├── upload-lesson-audio.use-case.ts
│   └── delete-old-files.use-case.ts
├── repositories/
│   └── file-metadata.repository.ts      # Lưu owner, size, mimeType, quota usage
└── validators/
    └── file-type.validator.ts           # Business validation theo domain