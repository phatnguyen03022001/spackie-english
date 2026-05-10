// src/modules/statistics/statistics.module.ts
import { Module } from '@nestjs/common';
import { StatisticsController } from '@modules/statistics/statistics.controller';
import { StatisticsService } from '@modules/statistics/statistics.service';

@Module({
  imports: [],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
