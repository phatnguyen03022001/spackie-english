// src/modules/payment/payment.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentRepository } from '@modules/payment/payment.repository';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import type {
  ISubscriptionInfo,
  ICreatePaymentResponse,
} from '@modules/payment/interfaces/payment.interface';
import type { PaymentProvider } from '@infrastructure/payment/payment.provider';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { PAYMENT_EVENTS } from '@common/constants/events.constants';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly pusherService: PusherService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    @Inject('PAYMENT_PROVIDER')
    private readonly paymentProvider: PaymentProvider,
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

    // Call real PayOS provider to get checkout URL
    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );
    const paymentResult = await this.paymentProvider.createPayment({
      amount,
      description: `Subscription ${plan}`,
      orderId: orderCode,
      returnUrl: `${frontendUrl}/payment/success`,
      cancelUrl: `${frontendUrl}/payment/cancel`,
    });

    return { orderCode, checkoutUrl: paymentResult.paymentUrl };
  }

  async getPaymentHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.paymentRepository.findPaymentsByUser(userId, skip, limit);
  }

  async getSubscription(userId: string): Promise<ISubscriptionInfo> {
    const cacheKey = CacheKeyBuilder.userResource(
      'payment',
      'subscription',
      userId,
    );
    const cached = await this.cacheManager.get<ISubscriptionInfo>(cacheKey);
    if (cached) return cached;

    const subscription =
      await this.paymentRepository.findSubscriptionByUser(userId);

    let result: ISubscriptionInfo;
    if (!subscription) {
      result = {
        status: 'NONE',
        plan: 'FREE',
        startedAt: null,
        expiresAt: null,
        autoRenew: false,
      };
    } else {
      result = {
        status: subscription.status,
        plan: subscription.plan,
        startedAt: subscription.startedAt,
        expiresAt: subscription.expiresAt,
        autoRenew:
          (subscription.meta as { autoRenew?: boolean })?.autoRenew ?? false,
      };
    }

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.SHORT);
    return result;
  }

  async cancelSubscription(userId: string) {
    const subscription =
      await this.paymentRepository.findSubscriptionByUser(userId);
    if (!subscription) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
        'No active subscription found',
      );
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
      meta: meta as Prisma.InputJsonValue,
    });

    // Invalidate cache
    await this.cacheManager.delPattern(`payment:subscription:${userId}`);

    return { message: 'Auto-renewal cancelled' };
  }

  async handlePaymentSuccess(orderCode: string): Promise<void> {
    const payment =
      await this.paymentRepository.findPaymentByOrderCode(orderCode);
    if (!payment) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.PAYMENT_NOT_FOUND,
        'Payment not found',
      );
    }

    if (payment.status === 'SUCCESS') {
      return; // Idempotent
    }

    // Update payment status
    await this.paymentRepository.updatePayment(orderCode, {
      status: 'SUCCESS',
    });

    // Calculate subscription dates
    const durationDays = payment.durationDays ?? 30;
    const now = new Date();

    // Check existing subscription to extend instead of overwrite
    const existing = await this.paymentRepository.findSubscriptionByUser(
      payment.userId,
    );
    let expiresAt: Date;
    if (
      existing &&
      existing.status === 'ACTIVE' &&
      existing.expiresAt &&
      existing.expiresAt > now
    ) {
      // Extend existing subscription
      expiresAt = new Date(existing.expiresAt);
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    } else {
      // New subscription
      expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    // Create or update subscription
    await this.paymentRepository.upsertSubscription(payment.userId, {
      userId: payment.userId,
      status: 'ACTIVE',
      plan: payment.plan,
      startedAt:
        existing && existing.status === 'ACTIVE' ? existing.startedAt : now,
      expiresAt,
      meta: { autoRenew: true },
    });

    // Invalidate subscription cache
    await this.cacheManager.delPattern(
      `payment:subscription:${payment.userId}`,
    );

    // Emit events for statistics and notifications
    this.eventEmitter.emit(PAYMENT_EVENTS.SUBSCRIPTION_ACTIVATED, {
      userId: payment.userId,
      plan: payment.plan,
      amount: payment.amount,
    });
    this.eventEmitter.emit(PAYMENT_EVENTS.SUCCESS, {
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

    // Invalidate subscription cache
    await this.cacheManager.delPattern(`payment:subscription:${userId}`);

    return { message: 'VIP subscription granted' };
  }

  async refundPayment(paymentId: string) {
    const payment =
      await this.paymentRepository.findPaymentByOrderCode(paymentId);
    if (!payment) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.PAYMENT_NOT_FOUND,
        'Payment not found',
      );
    }

    await this.paymentRepository.updatePayment(paymentId, {
      status: 'REFUNDED',
    });

    return { message: 'Payment refunded' };
  }
}
