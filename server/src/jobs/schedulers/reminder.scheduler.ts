// src/jobs/schedulers/reminder.scheduler.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * ReminderScheduler – automatically triggers daily reminder batch processing.
 *
 * Runs every 30 minutes to check for users whose reminderTime matches the current hour.
 * The actual filtering by reminderTime is done in the NotificationProcessor.
 */
@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    @InjectQueue('notification') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Run every 30 minutes to process daily reminders.
   * The processor will filter users by their reminderTime setting.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleReminderCron(): Promise<void> {
    this.logger.log('Running scheduled daily reminder check');

    try {
      await this.notificationQueue.add(
        'daily-reminder',
        { triggeredAt: new Date().toISOString() },
        { removeOnComplete: true },
      );
      this.logger.log('Daily reminder job enqueued successfully');
    } catch (error: unknown) {
      this.logger.error(
        `Failed to enqueue daily reminder job: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
