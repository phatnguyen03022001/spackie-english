import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PusherService } from '@infrastructure/pusher/pusher.service';

@Injectable()
export class PusherHealthIndicator {
  constructor(
    private pusherService: PusherService,
    private health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      const ok = await this.pusherService.ping();
      if (ok) return indicator.up();
      return indicator.down({ message: 'Pusher ping returned false' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }
}
