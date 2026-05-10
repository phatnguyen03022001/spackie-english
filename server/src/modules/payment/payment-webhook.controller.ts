// src/modules/payment/payment-webhook.controller.ts
import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@ApiTags('Payment Webhook')
@Controller('payment/webhook')
export class PaymentWebhookController {
  constructor(
    @InjectQueue('payment-webhook') private readonly paymentQueue: Queue,
  ) {}

  @Post('payos')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle PayOS webhook' })
  async handlePayOSWebhook(
    @Body() body: { orderCode: string; status: string; signature: string },
    @Headers('x-payos-signature') headerSignature: string,
  ) {
    // Verify signature (simplified - in production, verify with PayOS)
    if (body.signature !== headerSignature) {
      return { error: 'Invalid signature' };
    }

    // Only process successful payments
    if (body.status !== 'SUCCESS') {
      return { message: 'Payment not successful, ignored' };
    }

    // Enqueue for async processing
    await this.paymentQueue.add('process-payment', {
      orderCode: body.orderCode,
    });

    return { message: 'Webhook received, processing' };
  }
}
