// src/modules/metrics/metrics.controller.ts
import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrometheusService } from '@modules/metrics/prometheus.service';
import { Public } from '@common/decorators/public.decorator';
import { SkipTransform } from '@common/decorators/skip-transform.decorator';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  @Public()
  @SkipTransform()
  @ApiOperation({ summary: 'Expose Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics' })
  async getMetrics(
    @Headers('authorization') authHeader?: string,
  ): Promise<string> {
    // Optional token-based security for metrics endpoint
    const metricsToken = process.env.METRICS_TOKEN;
    if (metricsToken) {
      if (!authHeader) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
      const token = authHeader.replace('Bearer ', '');
      if (token !== metricsToken) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
    }

    return this.prometheusService.getMetrics();
  }
}
