// src/modules/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { PusherService } from '@infrastructure/pusher/pusher.service';

@Injectable()
export class NotificationService {
  constructor(private readonly pusherService: PusherService) {}

  /**
   * Send a realtime notification to a specific user via Pusher.
   * No email is sent. No in-app notification is stored in DB.
   */
  async send(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.pusherService.triggerToUser(userId, event, data);
  }
}
