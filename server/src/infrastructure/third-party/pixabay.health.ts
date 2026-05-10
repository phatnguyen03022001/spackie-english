import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PixabayClient } from '@infrastructure/third-party/pixabay.client';

@Injectable()
export class PixabayHealthIndicator {
  constructor(
    private pixabayClient: PixabayClient,
    private health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      const ok = await this.pixabayClient.ping();
      return ok
        ? indicator.up()
        : indicator.down({ message: 'Pixabay ping failed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }
}
