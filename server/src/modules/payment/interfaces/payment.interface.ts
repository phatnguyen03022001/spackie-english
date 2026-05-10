// src/modules/payment/interfaces/payment.interface.ts

export interface ISubscriptionInfo {
  status: string;
  plan: string;
  startedAt: Date | null;
  expiresAt: Date | null;
  autoRenew: boolean;
}

export interface ICreatePaymentResponse {
  orderCode: string;
  checkoutUrl: string;
}
