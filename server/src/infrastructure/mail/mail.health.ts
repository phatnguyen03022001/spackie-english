import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { MailService } from './mail.service';

@Injectable()
export class MailHealthIndicator {
  constructor(
    private readonly mailService: MailService,
    private readonly health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);

    try {
      // Gọi ping thay vì send email thật
      await this.mailService.ping();
      return indicator.up();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }
}
