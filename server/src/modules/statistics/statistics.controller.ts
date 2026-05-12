// src/modules/statistics/statistics.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { StatisticsService } from '@modules/statistics/statistics.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { VideoStatisticsResponseDto } from '@modules/statistics/dto/video-statistics.dto';
import {
  DashboardStatsDto,
  AdminOverviewDto,
} from '@modules/statistics/dto/dashboard-stats.dto';

@ApiTags('Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user dashboard statistics' })
  @ApiResponse({ status: 200, type: DashboardStatsDto })
  async getDashboard(
    @CurrentUser('id') userId: string,
  ): Promise<DashboardStatsDto> {
    return this.statisticsService.getDashboard(userId);
  }

  @Get('videos')
  @ApiOperation({ summary: 'Get YouTube video practice statistics' })
  @ApiResponse({ status: 200, type: VideoStatisticsResponseDto })
  async getVideoStats(
    @CurrentUser('id') userId: string,
  ): Promise<VideoStatisticsResponseDto> {
    return this.statisticsService.getVideoStats(userId);
  }

  @Get('admin/overview')
  @ApiOperation({ summary: 'Get admin overview statistics' })
  @ApiResponse({ status: 200, type: AdminOverviewDto })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getAdminOverview(): Promise<AdminOverviewDto> {
    return this.statisticsService.getAdminOverview();
  }
}
