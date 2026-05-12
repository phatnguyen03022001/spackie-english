// src/modules/study-session/dto/session-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SessionResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  startedAt!: Date;

  @ApiProperty({ required: false })
  @Expose()
  endedAt?: Date;

  @ApiProperty()
  @Expose()
  totalCardsReviewed!: number;

  @ApiProperty()
  @Expose()
  totalDurationMs!: number;

  constructor(partial: Partial<SessionResponseDto>) {
    Object.assign(this, partial);
  }
}
