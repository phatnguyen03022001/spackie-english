// src/modules/auth/email-quota.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis/redis.service';
import { LoggerService } from '@common/logger/logger.service';

export type EmailPriority = 'otp' | 'welcome' | 'payment' | 'broadcast';

@Injectable()
export class EmailQuotaService {
  private readonly DAILY_LIMIT = 300;
  private readonly WARNING_THRESHOLD = 270;
  private readonly HIGH_PRIORITY_ONLY_THRESHOLD = 240;

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EmailQuotaService.name);
  }

  private getTodayKey(): string {
    const today = new Date().toISOString().slice(0, 10);
    // Point Medium: Thêm prefix quota:
    return `quota:email:${today}`;
  }

  async canSend(priority: EmailPriority): Promise<boolean> {
    const key = this.getTodayKey();
    const countStr = await this.redisService.client.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= this.DAILY_LIMIT) {
      this.logger.warn(`Email quota exceeded: ${count}/${this.DAILY_LIMIT}`);
      return false;
    }
    if (
      count >= this.HIGH_PRIORITY_ONLY_THRESHOLD &&
      priority !== 'otp' &&
      priority !== 'payment'
    ) {
      this.logger.debug(
        `Email quota low (${count}/${this.DAILY_LIMIT}), skipping ${priority} email`,
      );
      return false;
    }
    return true;
  }

  async increment(): Promise<void> {
    const key = this.getTodayKey();
    // Point 4: Dùng INCR atomic
    const newCount = await this.redisService.client.incr(key);

    // Set TTL nếu là key mới (lần đầu tiên trong ngày)
    if (newCount === 1) {
      await this.redisService.client.expire(key, 86400); // 24h
    }

    if (newCount >= this.WARNING_THRESHOLD) {
      this.logger.warn(
        `Email quota nearly exhausted: ${newCount}/${this.DAILY_LIMIT}`,
      );
    }
  }

  async getCurrentCount(): Promise<number> {
    const countStr = await this.redisService.client.get(this.getTodayKey());
    return countStr ? parseInt(countStr, 10) : 0;
  }
}
