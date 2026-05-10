// src/config/services/tts-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TTSConfigService {
  constructor(private configService: ConfigService) {}

  get enabled(): boolean {
    return this.configService.get<boolean>('tts.enabled') ?? false;
  }

  get provider(): string {
    return this.configService.get<string>('tts.provider') ?? 'google';
  }

  get apiKey(): string | undefined {
    return this.configService.get<string>('tts.google.apiKey');
  }

  get language(): string {
    return this.configService.get<string>('tts.google.language') ?? 'en-US';
  }

  get voice(): string {
    return (
      this.configService.get<string>('tts.google.voice') ?? 'en-US-Standard-B'
    );
  }

  get speed(): number {
    return this.configService.get<number>('tts.google.speed') ?? 1.0;
  }

  get timeout(): number {
    return this.configService.get<number>('tts.google.timeout') ?? 15000;
  }
}
