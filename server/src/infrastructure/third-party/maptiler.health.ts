import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { MapTilerClient } from '@infrastructure/third-party/maptiler.client';

@Injectable()
export class MapTilerHealthIndicator {
  constructor(
    private mapTilerClient: MapTilerClient,
    private health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      // Dùng healthCheck() thay vì geocode('test') để tránh tốn quota
      const ok = await this.mapTilerClient.healthCheck();
      return ok
        ? indicator.up()
        : indicator.down({ message: 'Health check failed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }
}
