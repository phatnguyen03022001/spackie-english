// src/jobs/processors/notification.processor.ts

import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { MailService } from '@infrastructure/mail/mail.service';

/**
 * Notification processor – handles notification-related background jobs.
 *
 * Queues:
 * - `daily-reminder`: Sends daily reminder notifications to users with reminders enabled.
 * - `send-email`: Sends an email notification to a specific user.
 * - `send-push`: Sends a push notification to a specific user.
 */
@Processor('notification')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pusherService: PusherService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Process daily reminder batch.
   * Fetches active users who have reminders enabled and sends them a reminder
   * via Pusher (if pushEnabled) and/or email (if emailNotificationEnabled).
   */
  @Process('daily-reminder')
  async handleDailyReminder(job: Job<{ triggeredAt: string }>): Promise<void> {
    this.logger.log(
      `Processing daily reminder batch (triggered at: ${job.data.triggeredAt})`,
    );

    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      // Fetch all active users with their settings
      const users = await this.prisma.user.findMany({
        where: {
          isActive: true,
          isBanned: false,
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          settings: true,
        },
      });

      this.logger.log(`Found ${users.length} active users to evaluate`);

      let sentCount = 0;
      for (const user of users) {
        try {
          // Parse settings JSON
          const settings = (user.settings ?? {}) as Record<string, unknown>;
          const reminderEnabled = settings.reminderEnabled !== false; // default true
          const reminderTime = (settings.reminderTime as string) || '08:00';
          const pushEnabled = settings.pushEnabled !== false; // default true
          const emailNotificationEnabled =
            settings.emailNotificationEnabled !== false; // default true

          // Skip if reminders are disabled
          if (!reminderEnabled) continue;

          // Check if reminder time matches current time (within the same hour)
          // This allows the cron to run every 30 minutes and match users
          const reminderHour = reminderTime.split(':')[0];
          if (reminderHour !== String(currentHour).padStart(2, '0')) continue;

          // Send push notification via Pusher if enabled
          if (pushEnabled) {
            await this.pusherService.triggerToUser(user.id, 'daily.reminder', {
              message: "Don't forget to practice your English today!",
              displayName: user.displayName || user.email,
              triggeredAt: job.data.triggeredAt,
            });
          }

          // Send email if enabled
          if (emailNotificationEnabled) {
            const subject = 'Daily Practice Reminder - Spackie English';
            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hi ${user.displayName || 'there'}!</h2>
                <p>Don't forget to practice your English today with Spackie English!</p>
                <p>Consistent daily practice is the key to mastering a new language.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://spackie-english.com/study" 
                     style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 4px; font-size: 16px;">
                    Start Studying Now
                  </a>
                </div>
                <p style="color: #666; font-size: 12px;">
                  You received this email because you have reminders enabled in your Spackie English settings.
                </p>
              </div>
            `;
            await this.mailService.send(user.email, subject, html);
          }

          sentCount++;
        } catch (err: unknown) {
          this.logger.warn(
            `Failed to send reminder to user ${user.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      this.logger.log(
        `Daily reminder batch complete: ${sentCount}/${users.length} sent`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process daily reminder batch: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error; // Let Bull handle retry
    }
  }

  /**
   * Process send-email job.
   * Sends an email notification to a specific user.
   */
  @Process('send-email')
  async handleSendEmail(
    job: Job<{ userId: string; subject: string; body: string }>,
  ): Promise<void> {
    const { userId, subject, body } = job.data;
    this.logger.log(`Sending email to user ${userId}: "${subject}"`);

    try {
      // Fetch user email
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, displayName: true },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found, skipping email`);
        return;
      }

      // Send email via MailService
      await this.mailService.send(user.email, subject, body);

      this.logger.log(
        `Email sent to ${user.email} (${user.displayName || 'no name'}): ${subject}`,
      );

      // Also send a realtime notification via Pusher
      await this.pusherService.triggerToUser(userId, 'notification.email', {
        subject,
        body,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send email to user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Process send-push job.
   * Sends a push notification to a specific user.
   */
  @Process('send-push')
  async handleSendPush(
    job: Job<{ userId: string; title: string; message: string }>,
  ): Promise<void> {
    const { userId, title, message } = job.data;
    this.logger.log(`Sending push notification to user ${userId}: "${title}"`);

    try {
      // Send via Pusher (in production, also send via FCM/APNs)
      await this.pusherService.triggerToUser(userId, 'notification.push', {
        title,
        message,
      });

      this.logger.log(`Push notification sent to user ${userId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send push notification to user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
