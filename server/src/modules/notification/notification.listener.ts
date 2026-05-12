// src/modules/notification/notification.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '@modules/notification/notification.service';
import {
  USER_EVENTS,
  PAYMENT_EVENTS,
  STUDY_EVENTS,
  PUSHER_EVENTS,
} from '@common/constants/events.constants';

@Injectable()
export class NotificationListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent(USER_EVENTS.CREATED)
  async handleUserRegistered(payload: {
    userId: string;
    email?: string;
  }): Promise<void> {
    await this.notificationService.create(
      payload.userId,
      'system',
      'Welcome to Spackie English! 🎉',
      'Start your learning journey by exploring decks and practicing daily.',
      { event: 'user.registered' },
    );
  }

  @OnEvent(PAYMENT_EVENTS.SUCCESS)
  async handlePaymentSuccess(payload: {
    userId: string;
    amount?: number;
    plan?: string;
  }): Promise<void> {
    await this.notificationService.create(
      payload.userId,
      'payment',
      'Payment Successful ✅',
      `Your ${payload.plan || 'subscription'} payment of $${(payload.amount ?? 0) / 100} has been processed.`,
      {
        event: 'payment.succeeded',
        amount: payload.amount,
        plan: payload.plan,
      },
    );
  }

  @OnEvent(STUDY_EVENTS.STREAK_UPDATED)
  async handleStreakUpdated(payload: {
    userId: string;
    currentStreak: number;
  }): Promise<void> {
    const { currentStreak } = payload;
    // Only notify on milestone streaks (every 5 days)
    if (currentStreak > 0 && currentStreak % 5 === 0) {
      await this.notificationService.create(
        payload.userId,
        'achievement',
        `🔥 ${currentStreak}-Day Streak!`,
        `Amazing! You've maintained a ${currentStreak}-day study streak. Keep it up!`,
        { event: 'study.streak_updated', streak: currentStreak },
      );
    }
  }

  @OnEvent(PUSHER_EVENTS.CARD_MEDIA_READY)
  async handleCardMediaReady(payload: {
    userId: string;
    cardId?: string;
    front?: string;
  }): Promise<void> {
    await this.notificationService.create(
      payload.userId,
      'system',
      'Card Media Ready 🎵',
      `Media for card "${payload.front || 'your card'}" is now available.`,
      { event: 'card.media_ready', cardId: payload.cardId },
    );
  }
}
