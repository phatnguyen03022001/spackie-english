// src/modules/ai/dto/ai-usage-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class DailyUsageDto {
  @ApiProperty()
  @Expose()
  date!: string;

  @ApiProperty()
  @Expose()
  requests!: number;

  @ApiProperty()
  @Expose()
  tokens!: number;

  @ApiProperty()
  @Expose()
  cost!: number;

  constructor(partial: Partial<DailyUsageDto>) {
    Object.assign(this, partial);
  }
}

export class AiUsageResponseDto {
  @ApiProperty()
  @Expose()
  totalRequests!: number;

  @ApiProperty()
  @Expose()
  totalTokens!: number;

  @ApiProperty()
  @Expose()
  totalCost!: number;

  @ApiProperty({ type: [DailyUsageDto] })
  @Expose()
  dailyUsage!: DailyUsageDto[];

  constructor(partial: Partial<AiUsageResponseDto>) {
    Object.assign(this, partial);
  }
}

export class QuotaResponseDto {
  @ApiProperty({ description: 'Monthly limit in USD cents' })
  @Expose()
  monthlyLimit!: number;

  @ApiProperty({ description: 'Used this month in USD cents' })
  @Expose()
  usedThisMonth!: number;

  @ApiProperty({ description: 'Remaining in USD cents' })
  @Expose()
  remaining!: number;

  @ApiProperty({ description: 'ISO date of next reset' })
  @Expose()
  resetDate!: string;

  constructor(partial: Partial<QuotaResponseDto>) {
    Object.assign(this, partial);
  }
}
