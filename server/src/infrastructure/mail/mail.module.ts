import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/logger/logger.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { BrevoProvider } from '@infrastructure/mail/brevo.provider';
import { MailHealthIndicator } from '@infrastructure/mail/mail.health';
import { MailProvider } from '@infrastructure/mail/mail.provider';
import { TerminusModule } from '@nestjs/terminus';

@Global()
@Module({
  imports: [TerminusModule],
  providers: [
    {
      provide: MailProvider,
      useFactory: (config: ConfigService, logger: LoggerService) => {
        const apiKey = config.get<string>('mail.apiKey');
        const from = config.get<string>('mail.from');
        const fromName = config.get<string>('mail.fromName');
        if (!apiKey || !from) {
          throw new Error('Mail configuration missing: apiKey or from');
        }
        return new BrevoProvider(
          apiKey,
          from,
          fromName ?? 'Spackie English',
          logger,
        );
      },
      inject: [ConfigService, LoggerService],
    },
    MailService,
    MailHealthIndicator,
  ],
  exports: [MailService, MailHealthIndicator],
})
export class MailModule {}
