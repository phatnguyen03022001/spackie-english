import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentHealthIndicator {
  constructor(
    private paymentService: PaymentService,
    private health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      await this.paymentService.ping();
      return indicator.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }
}
