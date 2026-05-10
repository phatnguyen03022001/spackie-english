import { isAxiosError } from 'axios';
import crypto from 'crypto';
import type {
  PaymentProvider,
  CreatePaymentParams,
  PaymentResult,
} from '@infrastructure/payment/payment.provider';
import type { LoggerService } from '@common/logger/logger.service';
import {
  PayosClient,
  type PayOSCreatePaymentResponse,
} from '@infrastructure/payment/payos.client';
import { BusinessException } from '@/common/filters/business.exception';
import { HttpStatus } from '@nestjs/common';

/**
 * Generate a unique order code for PayOS.
 * Format: timestamp in milliseconds (13 digits) + random 3-digit suffix.
 * This avoids collisions even under high concurrency.
 */
function generateOrderCode(): number {
  const now = Date.now(); // milliseconds
  const randomSuffix = crypto.randomInt(0, 1000); // 0-999
  // Combine: e.g., 1745212345678 + 123 = 1745212345678123 (still within safe integer)
  // Note: JavaScript safe integer max is 9e15, 13+3=16 digits ~ 1e15, safe.
  return now * 1000 + randomSuffix;
}

export class PayosProvider implements PaymentProvider {
  private client: PayosClient;
  private readonly checksumKey: string;

  constructor(
    config: {
      clientId: string;
      apiKey: string;
      checksumKey: string;
      apiUrl: string;
      mode: string;
    },
    private readonly logger: LoggerService,
  ) {
    this.client = new PayosClient(
      config.apiUrl,
      30000,
      logger,
      config.clientId,
      config.apiKey,
    );
    this.checksumKey = config.checksumKey;
  }

  private generateSignature(data: string): string {
    return crypto
      .createHmac('sha256', this.checksumKey)
      .update(data)
      .digest('hex');
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const orderCode = generateOrderCode();
    const payload = {
      orderCode,
      amount: params.amount,
      description: params.description,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
      buyerPhone: params.buyerPhone,
      items: [],
    };
    const signature = this.generateSignature(JSON.stringify(payload));
    const requestData = { ...payload, signature };

    try {
      const response: PayOSCreatePaymentResponse =
        await this.client.createPayment(requestData);
      if (response.code === '00') {
        return {
          paymentUrl: response.data.checkoutUrl,
          orderId: String(orderCode),
          payosPaymentId: response.data.paymentLinkId,
        };
      }
      throw new BusinessException(
        HttpStatus.BAD_GATEWAY,
        'PAYMENT_CREATE_FAILED',
        `PayOS error: ${response.desc}`,
      );
    } catch (error) {
      this.logger.error({ error, params }, 'PayOS create payment failed');
      if (error instanceof BusinessException) throw error;
      throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'PAYMENT_CREATE_FAILED',
        'Payment creation failed',
      );
    }
  }

  async ping(): Promise<void> {
    try {
      // We use a dummy ID '0'. If the keys are correct, PayOS will return 404 (Order not found).
      // If the keys are wrong, it will return 401 Unauthorized.
      await this.client.getPaymentRequest('0');
    } catch (error: unknown) {
      // If we get a 404, it means we successfully reached the PayOS API and auth passed.
      if (isAxiosError(error) && error.response?.status === 404) {
        return;
      }

      this.logger.error({ err: error }, 'PayOS ping failed');
      const message =
        error instanceof Error ? error.message : 'Cannot reach PayOS API';
      throw new BusinessException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'PAYMENT_PING_FAILED',
        `PayOS ping failed: ${message}`,
      );
    }
  }

  verifyWebhook(signature: string, body: unknown): boolean {
    const expectedSignature = this.generateSignature(JSON.stringify(body));
    return signature === expectedSignature;
  }

  async getPaymentStatus(orderId: string): Promise<unknown> {
    try {
      const response = await this.client.getPaymentRequest(orderId);
      return response;
    } catch {
      throw new BusinessException(
        HttpStatus.BAD_GATEWAY,
        'PAYMENT_STATUS_FAILED',
        `Failed to get payment status for order ${orderId}`,
      );
    }
  }
}
