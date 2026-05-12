// src/modules/jobs/dto/job-history-query.dto.ts
import { IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';

export class JobHistoryQueryDto extends PaginationRequestDto {
  @ApiProperty({
    required: false,
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  @IsOptional()
  @IsIn(['pending', 'processing', 'completed', 'failed'])
  status?: string;
}

export class JobHistoryItemDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  cardId!: string;

  @ApiProperty()
  front!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false })
  error?: string;
}

export class JobMetadata {
  jobId!: string;
  cardId!: string;
  front!: string;
  status!: string;
  createdAt!: string;
  updatedAt!: string;
  error?: string;
}
