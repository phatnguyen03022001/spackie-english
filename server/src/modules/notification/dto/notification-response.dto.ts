// src/modules/notification/dto/notification-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class NotificationResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  type!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty()
  @Expose()
  body!: string;

  @ApiProperty()
  @Expose()
  data!: Record<string, unknown>;

  @ApiProperty()
  @Expose()
  isRead!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  constructor(partial: Partial<NotificationResponseDto>) {
    Object.assign(this, partial);
  }
}
