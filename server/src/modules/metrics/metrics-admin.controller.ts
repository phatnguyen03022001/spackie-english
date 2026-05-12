// src/modules/metrics/metrics-admin.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { SkipTransform } from '@common/decorators/skip-transform.decorator';
import { MetricsAggregateService } from '@modules/metrics/metrics-aggregate.service';
import { AggregateMetricsDto } from '@modules/metrics/dto/aggregate-metrics.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MetricsAdminController {
  constructor(
    private readonly metricsAggregateService: MetricsAggregateService,
  ) {}

  @Get('aggregate')
  @HttpCode(HttpStatus.OK)
  @SkipTransform()
  @ApiOperation({ summary: 'Get aggregated metrics (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Aggregated metrics',
    type: AggregateMetricsDto,
  })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  async getAggregate(): Promise<AggregateMetricsDto> {
    return this.metricsAggregateService.getAggregateMetrics();
  }
}
