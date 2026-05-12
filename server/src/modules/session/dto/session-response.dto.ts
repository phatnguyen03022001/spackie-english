// src/modules/session/dto/session-response.dto.ts
import { Expose } from 'class-transformer';

export class SessionResponseDto {
  @Expose()
  sessionId!: string;

  @Expose()
  deviceName?: string;

  @Expose()
  ip?: string;

  @Expose()
  userAgent?: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  lastUsedAt!: Date;

  @Expose()
  isCurrent!: boolean;
}
