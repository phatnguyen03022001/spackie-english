import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';

interface PresenceUserData {
  user_id: string;
  user_info?: Record<string, unknown>;
}

@Injectable()
export class PusherService implements OnModuleInit {
  private pusher!: Pusher;
  private readonly logger = new Logger(PusherService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const appId = this.configService.get<string>('pusher.appId');
    const key = this.configService.get<string>('pusher.key');
    const secret = this.configService.get<string>('pusher.secret');
    const cluster = this.configService.get<string>('pusher.cluster') ?? 'ap1';
    const useTLS = this.configService.get<boolean>('pusher.useTLS') ?? true;

    if (!appId || !key || !secret) {
      this.logger.error('Pusher credentials missing');
      throw new Error('Pusher configuration incomplete');
    }

    this.pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS,
    });
    this.logger.log('Pusher initialized');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async trigger(
    channel: string,
    event: string,
    data: unknown,
    socketId?: string,
  ): Promise<void> {
    let attempts = 0;
    const maxRetries = 3;
    while (attempts < maxRetries) {
      try {
        await this.pusher.trigger(channel, event, data, {
          socket_id: socketId,
        });
        return;
      } catch (error) {
        attempts++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Pusher trigger failed (attempt ${attempts}/${maxRetries}): ${errorMessage}`,
        );
        if (attempts === maxRetries) throw error;
        await this.delay(1000 * attempts);
      }
    }
  }

  async triggerToUser(
    userId: string,
    event: string,
    data: unknown,
  ): Promise<void> {
    await this.trigger(`private-user-${userId}`, event, data);
  }

  authenticate(
    socketId: string,
    channel: string,
    userData?: PresenceUserData,
  ): { auth: string; channel_data?: string } {
    if (channel.startsWith('private-')) {
      return this.pusher.authorizeChannel(socketId, channel, userData);
    }
    throw new Error('Only private channels supported');
  }

  async ping(): Promise<boolean> {
    try {
      await this.pusher.get({ path: '/channels' });
      return true;
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }
}
