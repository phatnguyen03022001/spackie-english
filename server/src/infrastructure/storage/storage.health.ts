import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { StorageService } from './storage.service';

@Injectable()
export class StorageHealthIndicator {
  constructor(
    private storageService: StorageService,
    private health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      await this.storageService.ping();
      return indicator.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }
}
