// src/common/dto/success-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PaginationMetaDto } from '@common/dto/pagination-response.dto';

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

  @ApiProperty({ required: false, type: () => PaginationMetaDto })
  @Expose()
  @Type(() => PaginationMetaDto)
  meta?: PaginationMetaDto;

  constructor(data: T, message?: string, meta?: PaginationMetaDto) {
    this.data = data;
    this.message = message;
    this.meta = meta;
  }
}
