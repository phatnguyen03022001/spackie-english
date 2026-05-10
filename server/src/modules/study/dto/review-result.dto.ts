// src/modules/study/dto/review-result.dto.ts
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewResultDto {
  @ApiProperty()
  @Expose()
  nextDueDate!: Date;

  @ApiProperty()
  @Expose()
  interval!: number;

  @ApiProperty()
  @Expose()
  easeFactor!: number;

  @ApiProperty()
  @Expose()
  dueCountRemaining!: number;

  constructor(partial: Partial<ReviewResultDto>) {
    Object.assign(this, partial);
  }
}
