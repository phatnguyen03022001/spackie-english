// src/modules/statistics/statistics.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StatisticsService } from '@modules/statistics/statistics.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type {
  IDashboardStats,
  IAdminOverview,
} from '@modules/statistics/interfaces/statistics.interface';

@ApiTags('Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user dashboard statistics' })
  async getDashboard(
    @CurrentUser('id') userId: string,
  ): Promise<IDashboardStats> {
    return this.statisticsService.getDashboard(userId);
  }

  @Get('admin/overview')
  @ApiOperation({ summary: 'Get admin overview statistics' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getAdminOverview(): Promise<IAdminOverview> {
    return this.statisticsService.getAdminOverview();
  }
}
