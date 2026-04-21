import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { DeepSeekClient } from './deepseek.client';

@Injectable()
export class DeepSeekHealthIndicator {
  constructor(
    private deepSeekClient: DeepSeekClient,
    private health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      const ok = await this.deepSeekClient.ping();
      return ok
        ? indicator.up()
        : indicator.down({ message: 'DeepSeek ping failed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }
}
