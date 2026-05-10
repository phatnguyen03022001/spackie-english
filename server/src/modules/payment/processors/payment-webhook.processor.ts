// src/modules/payment/processors/payment-webhook.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PaymentService } from '@modules/payment/payment.service';
import { LoggerService } from '@common/logger/logger.service';

@Processor('payment-webhook')
export class PaymentWebhookProcessor {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly logger: LoggerService,
  ) {}

  @Process('process-payment')
  async handlePaymentWebhook(job: Job<{ orderCode: string }>) {
    const { orderCode } = job.data;
    this.logger.log(`Processing payment webhook for order: ${orderCode}`);

    try {
      await this.paymentService.handlePaymentSuccess(orderCode);
      this.logger.log(`Payment processed successfully: ${orderCode}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process payment ${orderCode}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
