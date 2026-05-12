// src/modules/notification/notification.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { NotificationRepository } from '@modules/notification/notification.repository';
import { NotificationQueryDto } from '@modules/notification/dto/notification-query.dto';
import { NotificationResponseDto } from '@modules/notification/dto/notification-response.dto';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { NOTIFICATION_EVENTS } from '@common/constants/events.constants';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { getPaginationOffset } from '@common/utils/pagination.util';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class NotificationService {
  private readonly domain = 'notifications';

  constructor(
    private readonly repository: NotificationRepository,
    private readonly pusherService: PusherService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    @InjectQueue('notification') private readonly notificationQueue?: Queue,
  ) {}

  /**
   * Create an in-app notification for a user.
   */
  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<NotificationResponseDto> {
    const notification = await this.repository.create({
      userId,
      type,
      title,
      body,
      data,
    });

    // Invalidate list cache
    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, userId),
    );

    // Emit event
    this.eventEmitter.emit(NOTIFICATION_EVENTS.CREATED, {
      userId,
      notificationId: notification.id,
      type,
      title,
    });

    // Send realtime via Pusher
    await this.pusherService.triggerToUser(userId, 'notification.created', {
      id: notification.id,
      type,
      title,
      body,
      data,
    });

    return plainToInstance(NotificationResponseDto, notification, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get paginated notifications for a user.
   */
  async findByUser(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{ data: NotificationResponseDto[]; total: number }> {
    const cacheKey = CacheKeyBuilder.list(
      this.domain,
      userId,
      query.page,
      query.limit,
    );
    const cached = await this.cacheManager.get<{
      data: NotificationResponseDto[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const skip = getPaginationOffset({ page: query.page, limit: query.limit });
    const result = await this.repository.findByUser(userId, skip, query.limit);

    const data = result.notifications.map((n) =>
      plainToInstance(NotificationResponseDto, n, {
        excludeExtraneousValues: true,
      }),
    );

    const response = { data, total: result.total };
    await this.cacheManager.set(cacheKey, response, CACHE_TTL.SHORT);
    return response;
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.repository.findById(notificationId);
    if (!notification) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.NOTIFICATION_NOT_FOUND,
        'Notification not found',
      );
    }

    if (notification.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'You do not own this notification',
      );
    }

    await this.repository.markAsRead(notificationId);

    // Invalidate cache
    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, userId),
    );

    this.eventEmitter.emit(NOTIFICATION_EVENTS.READ, {
      userId,
      notificationId,
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.repository.markAllAsRead(userId);

    // Invalidate cache
    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, userId),
    );
  }

  /**
   * Delete a notification.
   */
  async delete(userId: string, notificationId: string): Promise<void> {
    const notification = await this.repository.findById(notificationId);
    if (!notification) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.NOTIFICATION_NOT_FOUND,
        'Notification not found',
      );
    }

    if (notification.userId !== userId) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'You do not own this notification',
      );
    }

    await this.repository.delete(notificationId);

    // Invalidate cache
    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, userId),
    );

    this.eventEmitter.emit(NOTIFICATION_EVENTS.DELETED, {
      userId,
      notificationId,
    });
  }

  /**
   * Get unread count for a user.
   */
  async countUnread(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.repository.countUnread(userId);
    return { unreadCount: count };
  }

  /**
   * Send a realtime notification to a specific user via Pusher.
   */
  async send(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.pusherService.triggerToUser(userId, event, data);
  }

  /**
   * Get queue status for admin monitoring.
   */
  async getQueueStatus(): Promise<Record<string, unknown>> {
    if (!this.notificationQueue) {
      return { status: 'Queue not configured' };
    }
    const [waiting, active, completed, failed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }

  /**
   * Trigger daily reminder batch manually (admin only).
   */
  async triggerDailyReminder(): Promise<void> {
    if (!this.notificationQueue) {
      return;
    }
    await this.notificationQueue.add(
      'daily-reminder',
      { triggeredAt: new Date().toISOString() },
      { removeOnComplete: true },
    );
  }
}
