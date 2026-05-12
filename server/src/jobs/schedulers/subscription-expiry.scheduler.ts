// src/jobs/schedulers/subscription-expiry.scheduler.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@common/logger/logger.service';
import { PAYMENT_EVENTS } from '@common/constants/events.constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisLockService } from '@infrastructure/redis/redis-lock.service';

@Injectable()
export class SubscriptionExpiryScheduler {
  private readonly LOCK_TTL = 120; // 120 seconds for subscription expiry

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisLockService: RedisLockService,
  ) {
    this.logger.setContext(SubscriptionExpiryScheduler.name);
  }

  /**
   * Run daily at midnight to expire subscriptions that have passed their expiry date.
   * No email is sent. The client will see the updated status when they call GET /payment/subscription.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpiry(): Promise<void> {
    const lockKey = 'cron:subscription-expiry:handle-expiry';
    try {
      await this.redisLockService.withLock(lockKey, this.LOCK_TTL, async () => {
        this.logger.log('Running subscription expiry check...');

        const now = new Date();

        try {
          // Find all ACTIVE subscriptions that have expired
          const expiredSubscriptions = await this.prisma.subscription.findMany({
            where: {
              status: 'ACTIVE',
              expiresAt: { lte: now },
            },
            select: { userId: true, plan: true },
          });

          if (expiredSubscriptions.length === 0) {
            this.logger.log('No expired subscriptions found.');
            return;
          }

          // Update all expired subscriptions to EXPIRED status
          await this.prisma.subscription.updateMany({
            where: {
              status: 'ACTIVE',
              expiresAt: { lte: now },
            },
            data: { status: 'EXPIRED' },
          });

          // Emit events for each expired subscription
          for (const sub of expiredSubscriptions) {
            this.eventEmitter.emit(PAYMENT_EVENTS.SUBSCRIPTION_EXPIRED, {
              userId: sub.userId,
              plan: sub.plan,
            });
          }

          this.logger.log(
            `Expired ${expiredSubscriptions.length} subscription(s).`,
          );
        } catch (error: unknown) {
          this.logger.error(
            `Failed to process subscription expiry: ${(error as Error).message}`,
          );
        }
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === 'Could not acquire lock'
      ) {
        this.logger.warn(
          `Subscription expiry cron skipped – lock not acquired (another instance is running)`,
        );
        return;
      }
      throw error;
    }
  }
}
