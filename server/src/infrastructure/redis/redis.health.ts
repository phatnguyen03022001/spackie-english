import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { RedisService } from './redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private redisService: RedisService,
    private health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      await this.redisService.ping();
      return indicator.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }
}
