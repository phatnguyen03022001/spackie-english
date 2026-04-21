export interface CreatePaymentParams {
  amount: number;
  description: string;
  orderId: string;
  returnUrl: string;
  cancelUrl: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
}

export interface PaymentResult {
  paymentUrl: string;
  orderId: string;
  payosPaymentId?: string;
}

export interface WebhookPayload {
  code: string;
  desc: string;
  data: {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    paymentLinkId: string;
    code: string;
    desc: string;
    counterAccountBankId: string;
    counterAccountBankName: string;
    counterAccountName: string;
    counterAccountNumber: string;
    virtualAccountName: string;
    virtualAccountNumber: string;
  };
}

export interface PaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyWebhook(signature: string, body: unknown): boolean;
  getPaymentStatus(orderId: string): Promise<unknown>;
  ping(): Promise<void>;
}
