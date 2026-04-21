import { BrevoClient } from '@getbrevo/brevo';
import type { LoggerService } from '@common/logger/logger.service';
import { AppException } from '@common/filters/app-exception';
import { HttpStatus } from '@nestjs/common';
import { MailProvider } from './mail.provider';

export class BrevoProvider extends MailProvider {
  private client: BrevoClient;
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fromName: string,
    private readonly logger: LoggerService,
  ) {
    super(); // ✅ bắt buộc

    this.client = new BrevoClient({
      apiKey,
      timeoutInSeconds: 30,
      maxRetries: 3,
    });
  }

  async send(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.from, name: this.fromName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      });
    } catch (error) {
      this.logger.error({ error, to, subject }, 'Brevo send failed');
      throw new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'MAIL_SEND_FAILED',
        'Failed to send email via Brevo',
      );
    }
  }

  async ping(): Promise<void> {
    try {
      // Gọi API nhẹ để kiểm tra kết nối và API key
      await this.client.transactionalEmails.getSmtpReport({ limit: 1 });
    } catch (error) {
      this.logger.error({ error }, 'Brevo ping failed');
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'MAIL_PING_FAILED',
        'Cannot reach Brevo API',
      );
    }
  }
}
