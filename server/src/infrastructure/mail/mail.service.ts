import { Injectable } from '@nestjs/common';
import { MailProvider } from '@infrastructure/mail/mail.provider';

@Injectable()
export class MailService {
  constructor(private readonly provider: MailProvider) {}

  async send(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    return this.provider.send(to, subject, html, text);
  }

  async ping(): Promise<void> {
    return this.provider.ping();
  }
}
