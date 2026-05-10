import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayOSConfigService {
  constructor(private configService: ConfigService) {}

  get clientId(): string {
    return this.configService.get<string>('payos.clientId')!;
  }
  get apiKey(): string {
    return this.configService.get<string>('payos.apiKey')!;
  }
  get checksumKey(): string {
    return this.configService.get<string>('payos.checksumKey')!;
  }
  get apiUrl(): string {
    return (
      this.configService.get<string>('payos.apiUrl') ??
      'https://api-merchant.payos.vn'
    );
  }
  get mode(): string {
    return this.configService.get<string>('payos.mode') ?? 'sandbox';
  }
  get isSandbox(): boolean {
    return this.mode === 'sandbox';
  }
}
