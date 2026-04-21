import { BaseApiClient } from '../third-party/base.client';
import type { LoggerService } from '@common/logger/logger.service';

export interface PayOSCreatePaymentResponse {
  code: string;
  desc: string;
  data: {
    checkoutUrl: string;
    paymentLinkId: string;
    orderCode: number;
  };
}

export interface PayOSGetPaymentResponse {
  code: string;
  desc: string;
  data: {
    orderCode: number;
    amount: number;
    status: string;
  };
}

export class PayosClient extends BaseApiClient {
  constructor(
    baseURL: string,
    timeoutMs: number,
    logger: LoggerService,
    private readonly clientId: string,
    private readonly apiKey: string,
  ) {
    super(baseURL, timeoutMs, logger, 3, 1000, true, 'PayOS');
  }

  async createPayment(
    requestData: unknown,
  ): Promise<PayOSCreatePaymentResponse> {
    return this.post<PayOSCreatePaymentResponse>(
      '/v2/payment-requests',
      requestData,
      {
        headers: {
          'x-client-id': this.clientId,
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async getPaymentRequests(params: unknown): Promise<PayOSGetPaymentResponse> {
    return this.get<PayOSGetPaymentResponse>('/v2/payment-requests', {
      params,
      headers: { 'x-client-id': this.clientId, 'x-api-key': this.apiKey },
    });
  }

  async getPaymentRequest(orderId: string): Promise<PayOSGetPaymentResponse> {
    return this.get<PayOSGetPaymentResponse>(
      `/v2/payment-requests/${orderId}`,
      {
        headers: { 'x-client-id': this.clientId, 'x-api-key': this.apiKey },
      },
    );
  }
}
