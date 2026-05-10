import {
  Controller,
  Post,
  Headers,
  Body,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Public } from '@common/decorators/public.decorator';
import { PaymentService } from '@infrastructure/payment/payment.service';
import { LoggerService } from '@common/logger/logger.service';
import { RedisService } from '@infrastructure/redis/redis.service';

interface PayOSWebhookBody {
  code: string;
  desc: string;
  data: {
    orderCode: number;
    amount: number;
    description: string;
    paymentLinkId: string;
    status: string;
  };
}

@Controller('webhooks/payment')
export class PaymentWebhookController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService, // inject Redis
  ) {}

  @Post('payos')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handlePayOSWebhook(
    @Headers('x-payos-signature') signature: string,
    @Body() body: PayOSWebhookBody,
  ) {
    const orderCode = body.data.orderCode;
    const idempotencyKey = `payos:webhook:${orderCode}`;

    // Kiểm tra duplicate
    const exists = await this.redisService.client.exists(idempotencyKey);
    if (exists) {
      this.logger.debug(`Duplicate webhook for order ${orderCode}, ignored`);
      return { success: true, alreadyProcessed: true };
    }

    const isValid = this.paymentService.verifyWebhook(signature, body);
    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
      return { error: 'Invalid signature' };
    }

    // Lưu lại để không xử lý lần sau (TTL 24h)
    await this.redisService.client.setex(idempotencyKey, 86400, 'processed');

    // Xử lý cập nhật order (gọi service business, emit event...)
    this.logger.log(
      { orderCode, amount: body.data.amount },
      'Payment webhook verified',
    );

    return { success: true };
  }
}
