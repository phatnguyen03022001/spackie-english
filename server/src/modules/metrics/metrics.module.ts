// src/modules/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import { MetricsController } from '@modules/metrics/metrics.controller';
import { MetricsAdminController } from '@modules/metrics/metrics-admin.controller';
import { PrometheusService } from '@modules/metrics/prometheus.service';
import { MetricsAggregateService } from '@modules/metrics/metrics-aggregate.service';
import { PrismaModule } from '@database/prisma.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [PrismaModule, RedisModule, LoggerModule],
  controllers: [MetricsController, MetricsAdminController],
  providers: [PrometheusService, MetricsAggregateService],
  exports: [PrometheusService, MetricsAggregateService],
})
export class MetricsModule {}
