// src/modules/listening/dto/listening-result.dto.ts
import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListeningResultDto {
  @ApiProperty()
  @Expose()
  score!: number;

  @ApiProperty()
  @Expose()
  accuracy!: number;

  @ApiProperty()
  @Expose()
  fluency!: number;

  @ApiProperty()
  @Expose()
  duration!: number;

  @ApiPropertyOptional()
  @Expose()
  transcript?: string;

  @ApiPropertyOptional()
  @Expose()
  feedback?: string;

  constructor(partial: Partial<ListeningResultDto>) {
    Object.assign(this, partial);
  }
}
