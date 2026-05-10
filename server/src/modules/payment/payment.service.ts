// src/modules/payment/payment.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentRepository } from '@modules/payment/payment.repository';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import type {
  ISubscriptionInfo,
  ICreatePaymentResponse,
} from '@modules/payment/interfaces/payment.interface';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly pusherService: PusherService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPayment(
    userId: string,
    plan: string,
    amount: number,
  ): Promise<ICreatePaymentResponse> {
    // Generate a unique order code
    const orderCode = `PAY-${Date.now()}-${userId.slice(0, 8)}`;

    // Create payment record
    await this.paymentRepository.createPayment({
      userId,
      orderCode,
      amount,
      plan,
      durationDays: 30,
      status: 'PENDING',
    });

    // In production, integrate with PayOS to get checkout URL
    const checkoutUrl = `https://payos.example.com/checkout/${orderCode}`;

    return { orderCode, checkoutUrl };
  }

  async getPaymentHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.paymentRepository.findPaymentsByUser(userId, skip, limit);
  }

  async getSubscription(userId: string): Promise<ISubscriptionInfo> {
    const subscription =
      await this.paymentRepository.findSubscriptionByUser(userId);

    if (!subscription) {
      return {
        status: 'NONE',
        plan: 'FREE',
        startedAt: null,
        expiresAt: null,
        autoRenew: false,
      };
    }

    return {
      status: subscription.status,
      plan: subscription.plan,
      startedAt: subscription.startedAt,
      expiresAt: subscription.expiresAt,
      autoRenew:
        (subscription.meta as { autoRenew?: boolean })?.autoRenew ?? false,
    };
  }

  async cancelSubscription(userId: string) {
    const subscription =
      await this.paymentRepository.findSubscriptionByUser(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const meta = {
      ...(subscription.meta as Record<string, unknown>),
      autoRenew: false,
    };

    await this.paymentRepository.upsertSubscription(userId, {
      userId,
      status: subscription.status,
      plan: subscription.plan,
      startedAt: subscription.startedAt,
      expiresAt: subscription.expiresAt,
      meta: meta as any,
    });

    return { message: 'Auto-renewal cancelled' };
  }

  async handlePaymentSuccess(orderCode: string): Promise<void> {
    const payment =
      await this.paymentRepository.findPaymentByOrderCode(orderCode);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'SUCCESS') {
      return; // Idempotent
    }

    // Update payment status
    await this.paymentRepository.updatePayment(orderCode, {
      status: 'SUCCESS',
    });

    // Calculate subscription dates
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

    // Create or update subscription
    await this.paymentRepository.upsertSubscription(payment.userId, {
      userId: payment.userId,
      status: 'ACTIVE',
      plan: payment.plan,
      startedAt: now,
      expiresAt,
      meta: { autoRenew: true },
    });

    // Emit event for statistics
    this.eventEmitter.emit('subscription.activated', {
      userId: payment.userId,
      plan: payment.plan,
      amount: payment.amount,
    });

    // Send realtime notification via Pusher
    await this.pusherService.triggerToUser(payment.userId, 'payment.success', {
      orderCode,
      amount: payment.amount,
      plan: payment.plan,
      expiresAt: expiresAt.toISOString(),
    });
  }

  // Admin methods
  async getAllSubscriptions(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.paymentRepository.findAllSubscriptions(skip, limit);
  }

  async grantVipSubscription(
    userId: string,
    plan: string,
    durationDays: number,
  ) {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    await this.paymentRepository.upsertSubscription(userId, {
      userId,
      status: 'ACTIVE',
      plan,
      startedAt: now,
      expiresAt,
      meta: { autoRenew: false, grantedByAdmin: true },
    });

    return { message: 'VIP subscription granted' };
  }

  async refundPayment(paymentId: string) {
    const payment =
      await this.paymentRepository.findPaymentByOrderCode(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.paymentRepository.updatePayment(paymentId, {
      status: 'REFUNDED',
    });

    return { message: 'Payment refunded' };
  }
}
