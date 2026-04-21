import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/logger/logger.service';
import { PaymentService } from './payment.service';
import { PayosProvider } from './payos.provider';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PaymentHealthIndicator } from './payment.health';
import { RedisModule } from '../redis/redis.module';
import { TerminusModule } from '@nestjs/terminus';

@Global()
@Module({
  imports: [RedisModule, TerminusModule],
  controllers: [PaymentWebhookController],
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
  exports: [PaymentService, PaymentHealthIndicator],
})
export class PaymentModule {}
