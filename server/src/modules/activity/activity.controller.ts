// src/modules/activity/activity.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ActivityService } from '@modules/activity/activity.service';
import { ActivityQueryDto } from '@modules/activity/dto/activity-query.dto';
import { ActivityResponseDto } from '@modules/activity/dto/activity-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { RequestUser } from '@common/interfaces/request-user.interface';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('users/me/activities')
  @ApiOperation({ summary: 'Get current user activities (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated activities' })
  async findMyActivities(
    @CurrentUser() user: RequestUser,
    @Query() query: ActivityQueryDto,
  ): Promise<{ data: ActivityResponseDto[]; total: number }> {
    return this.activityService.findByUser(user.id, query);
  }

  @Get('admin/users/:userId/activities')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get activities of a specific user (admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Paginated user activities' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN)' })
  async findUserActivities(
    @Param('userId') userId: string,
    @Query() query: ActivityQueryDto,
  ): Promise<{ data: ActivityResponseDto[]; total: number }> {
    return this.activityService.findByUser(userId, query);
  }
}
