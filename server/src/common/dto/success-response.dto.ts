// src/common/dto/success-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SuccessResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  @Expose()
  readonly success = true as const;

  @ApiProperty()
  @Expose()
  data!: T;

  @ApiProperty({ required: false, example: 'Operation successful' })
  @Expose()
  message?: string;

  @ApiProperty({ required: false })
  @Expose()
  meta?: unknown;

  constructor(data: T, message?: string, meta?: unknown) {
    this.data = data;
    this.message = message;
    this.meta = meta;
  }
}
