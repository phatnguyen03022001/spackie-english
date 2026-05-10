import { Inject, Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentResult,
} from '@infrastructure/payment/payment.provider';

@Injectable()
export class PaymentService {
  constructor(
    @Inject('PAYMENT_PROVIDER') private readonly provider: PaymentProvider,
  ) {}

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    return this.provider.createPayment(params);
  }

  verifyWebhook(signature: string, body: unknown): boolean {
    return this.provider.verifyWebhook(signature, body);
  }

  ping(): Promise<void> {
    return this.provider.ping();
  }

  async getPaymentStatus(orderId: string): Promise<unknown> {
    return this.provider.getPaymentStatus(orderId);
  }
}
