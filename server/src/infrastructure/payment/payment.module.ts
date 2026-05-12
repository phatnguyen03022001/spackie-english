import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/logger/logger.service';
import { PaymentService } from '@infrastructure/payment/payment.service';
import { PayosProvider } from '@infrastructure/payment/payos.provider';
import { PaymentHealthIndicator } from '@infrastructure/payment/payment.health';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { TerminusModule } from '@nestjs/terminus';

@Global()
@Module({
  imports: [RedisModule, TerminusModule],
  // Webhook controller moved to modules/payment/payment-webhook.controller.ts
  // The infrastructure controller is disabled to avoid route conflicts
  controllers: [],
  providers: [
    {
      provide: 'PAYMENT_PROVIDER',
      useFactory: (
        config: ConfigService,
        logger: LoggerService,
      ): PayosProvider => {
        const clientId = config.get<string>('payos.clientId');
        const apiKey = config.get<string>('payos.apiKey');
        const checksumKey = config.get<string>('payos.checksumKey');
        const apiUrl =
          config.get<string>('payos.apiUrl') ?? 'https://api-merchant.payos.vn';
        const mode = config.get<string>('payos.mode') ?? 'sandbox';

        if (!clientId || !apiKey || !checksumKey) {
          throw new Error(
            'PayOS configuration missing: clientId, apiKey, checksumKey are required',
          );
        }

        return new PayosProvider(
          { clientId, apiKey, checksumKey, apiUrl, mode },
          logger,
        );
      },
      inject: [ConfigService, LoggerService],
    },
    PaymentService,
    PaymentHealthIndicator,
  ],
  exports: [PaymentService, PaymentHealthIndicator, 'PAYMENT_PROVIDER'],
})
export class PaymentModule {}
