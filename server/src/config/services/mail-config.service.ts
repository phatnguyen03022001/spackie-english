import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailConfigService {
  constructor(private configService: ConfigService) {}

  get provider(): string {
    return this.configService.get<string>('mail.provider') ?? 'brevo';
  }
  get apiKey(): string | undefined {
    return this.configService.get<string>('mail.apiKey');
  }
  get from(): string | undefined {
    return this.configService.get<string>('mail.from');
  }
  get fromName(): string | undefined {
    return this.configService.get<string>('mail.fromName');
  }
}
