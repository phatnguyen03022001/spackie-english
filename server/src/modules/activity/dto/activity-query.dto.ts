// src/modules/activity/dto/activity-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';

export class ActivityQueryDto extends PaginationRequestDto {
  @ApiPropertyOptional({
    description:
      'Filter by activity type (e.g. VIEW_DECK, CREATE_CARD, REVIEW_CARD)',
  })
  @IsOptional()
  @IsString()
  type?: string;
}
