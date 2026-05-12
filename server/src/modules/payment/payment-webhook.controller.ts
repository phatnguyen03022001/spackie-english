// src/modules/payment/payment-webhook.controller.ts
import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('Payment Webhook')
@Controller('payment/webhook')
@Public()
export class PaymentWebhookController {
  private readonly checksumKey: string;

  constructor(
    @InjectQueue('payment-webhook') private readonly paymentQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.checksumKey = this.configService.get<string>('payos.checksumKey', '');
  }

  @Post('payos')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle PayOS webhook' })
  @ApiResponse({
    status: 200,
    description: 'Webhook acknowledged',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Webhook received, processing',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature',
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'string',
          example: 'Invalid signature',
        },
      },
    },
  })
  async handlePayOSWebhook(
    @Body()
    body: {
      orderCode: string;
      status: string;
      signature: string;
      amount?: number;
      description?: string;
    },
    @Headers('x-payos-signature') headerSignature: string,
  ) {
    // Verify signature using PayOS method:
    // Signature = HMAC_SHA256(checksumKey, payload sorted by keys)
    const signature = headerSignature || body.signature;
    if (!this.verifyPayOSSignature(body, signature)) {
      return { error: 'Invalid signature' };
    }

    // Only process successful payments
    if (body.status !== 'SUCCESS') {
      return { message: 'Payment not successful, ignored' };
    }

    // Enqueue for async processing
    // Idempotency is handled by the processor (checks payment status before processing)
    await this.paymentQueue.add('process-payment', {
      orderCode: body.orderCode,
    });

    return { message: 'Webhook received, processing' };
  }

  /**
   * Verify PayOS webhook signature.
   * PayOS signs the payload using HMAC-SHA256 with the checksum key.
   * The payload is sorted by keys alphabetically before signing.
   */
  private verifyPayOSSignature(
    body: Record<string, unknown>,
    signature: string,
  ): boolean {
    if (!this.checksumKey || !signature) {
      return false;
    }

    // Create a copy without the signature field
    const { signature: _sig, ...dataToSign } = body;

    // Sort keys alphabetically and create string
    const sortedKeys = Object.keys(dataToSign).sort();
    const signString = sortedKeys
      .map((key) => `${String(key)}=${String(dataToSign[key])}`)
      .join('&');

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', this.checksumKey)
      .update(signString)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature);
    const sigBuf = Buffer.from(signature);
    if (expectedBuf.length !== sigBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  }
}
