// src/modules/statistics/dto/video-statistics.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class WeeklyVideoStats {
  @ApiProperty({ example: '2026-05-04' })
  weekStart!: string;

  @ApiProperty({ example: '2026-05-10' })
  weekEnd!: string;

  @ApiProperty({ example: 1200 })
  totalDurationSec!: number;

  @ApiProperty({ example: 3 })
  uniqueVideos!: number;
}

export class MonthlyVideoStats {
  @ApiProperty({ example: '2026-05' })
  month!: string;

  @ApiProperty({ example: 4800 })
  totalDurationSec!: number;

  @ApiProperty({ example: 10 })
  uniqueVideos!: number;
}

export class AllTimeVideoStats {
  @ApiProperty({ example: 36000 })
  totalDurationSec!: number;

  @ApiProperty({ example: 25 })
  uniqueVideos!: number;
}

export class VideoStatisticsResponseDto {
  @ApiProperty({ type: [WeeklyVideoStats] })
  weekly!: WeeklyVideoStats[];

  @ApiProperty({ type: [MonthlyVideoStats] })
  monthly!: MonthlyVideoStats[];

  @ApiProperty({ type: AllTimeVideoStats })
  allTime!: AllTimeVideoStats;
}
