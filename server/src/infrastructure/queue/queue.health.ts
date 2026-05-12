// src/infrastructure/queue/queue.health.ts
import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueHealthIndicator {
  constructor(
    @InjectQueue('media-enrichment')
    private readonly mediaEnrichmentQueue: Queue,
    @InjectQueue('ai-enrichment')
    private readonly aiEnrichmentQueue: Queue,
    @InjectQueue('payment-webhook')
    private readonly paymentWebhookQueue: Queue,
    private readonly health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      // Ping each queue to check connection
      const [mediaOk, aiOk, paymentOk] = await Promise.all([
        this.pingQueue(this.mediaEnrichmentQueue),
        this.pingQueue(this.aiEnrichmentQueue),
        this.pingQueue(this.paymentWebhookQueue),
      ]);

      if (mediaOk && aiOk && paymentOk) {
        return indicator.up();
      }

      const details: Record<string, string> = {};
      if (!mediaOk) details['media-enrichment'] = 'unreachable';
      if (!aiOk) details['ai-enrichment'] = 'unreachable';
      if (!paymentOk) details['payment-webhook'] = 'unreachable';

      return indicator.down({
        message: 'Some queues are unreachable',
        ...details,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ message });
    }
  }

  private async pingQueue(queue: Queue): Promise<boolean> {
    try {
      const client = await queue.client;
      client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
