// src/modules/metrics/dto/aggregate-metrics.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AggregateMetricsDto {
  @ApiProperty({ example: 150 })
  dailyActiveUsers!: number;

  @ApiProperty({ example: 25 })
  newDecksToday!: number;

  @ApiProperty({ example: 500 })
  newCardsToday!: number;

  @ApiProperty({ example: 5000000 })
  totalRevenueThisMonth!: number;

  @ApiProperty({ example: 45 })
  averageApiResponseTimeMs!: number;

  @ApiProperty({ example: 0.5 })
  errorRatePercent!: number;

  @ApiProperty({ example: 10 })
  queueBacklog!: number;
}
