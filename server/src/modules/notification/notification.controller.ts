// src/modules/notification/notification.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated notifications',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: NotificationQueryDto,
  ): Promise<{ data: NotificationResponseDto[]; total: number }> {
    return this.notificationService.findByUser(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(
    @CurrentUser() user: RequestUser,
  ): Promise<{ unreadCount: number }> {
    return this.notificationService.countUnread(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  @ApiResponse({ status: 404, description: 'NOTIFICATION_NOT_FOUND' })
  async markAsRead(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.notificationService.markAsRead(user.id, id);
    return new SuccessResponseDto(null, 'Notification marked as read');
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All marked as read' })
  async markAllAsRead(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<null>> {
    await this.notificationService.markAllAsRead(user.id);
    return new SuccessResponseDto(null, 'All notifications marked as read');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'NOTIFICATION_NOT_FOUND' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.notificationService.delete(user.id, id);
    return new SuccessResponseDto(null, 'Notification deleted');
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification to current user' })
  @ApiResponse({ status: 201, description: 'Test notification sent' })
  async sendTest(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<null>> {
    await this.notificationService.send(user.id, 'test.event', {
      message: 'Test notification',
    });
    return new SuccessResponseDto(null, 'Test notification sent');
  }

  @Get('admin/queues')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'View queue status (admin)' })
  @ApiResponse({ status: 200, description: 'Queue status' })
  async getQueueStatus(): Promise<SuccessResponseDto<unknown>> {
    const status = await this.notificationService.getQueueStatus();
    return new SuccessResponseDto(status);
  }

  @Post('admin/reminder/run')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manually trigger daily reminder batch' })
  @ApiResponse({ status: 201, description: 'Reminder batch triggered' })
  async triggerReminder(): Promise<SuccessResponseDto<null>> {
    await this.notificationService.triggerDailyReminder();
    return new SuccessResponseDto(null, 'Reminder batch triggered');
  }
}
