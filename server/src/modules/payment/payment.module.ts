// src/modules/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import {
  PaymentController,
  AdminPaymentController,
} from '@modules/payment/payment.controller';
import { PaymentWebhookController } from '@modules/payment/payment-webhook.controller';
import { PaymentService } from '@modules/payment/payment.service';
import { PaymentRepository } from '@modules/payment/payment.repository';
import { PaymentWebhookProcessor } from '@modules/payment/processors/payment-webhook.processor';
import { PusherModule } from '@infrastructure/pusher/pusher.module';
import { PrismaModule } from '@database/prisma.module';
import { PaymentModule as InfraPaymentModule } from '@/infrastructure/payment/payment.module';

@Module({
  imports: [
    PrismaModule,
    PusherModule,
    BullModule.registerQueue({
      name: 'payment-webhook',
    }),
    InfraPaymentModule,
  ],
  controllers: [
    PaymentController,
    AdminPaymentController,
    PaymentWebhookController,
  ],
  providers: [PaymentService, PaymentRepository, PaymentWebhookProcessor],
  exports: [PaymentService],
})
export class PaymentModule {}
