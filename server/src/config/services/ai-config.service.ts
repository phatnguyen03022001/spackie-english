import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIConfigService {
  constructor(private configService: ConfigService) {}

  get provider(): string {
    return this.configService.get<string>('ai.provider') ?? 'deepseek';
  }
  get enabled(): boolean {
    return this.configService.get<boolean>('ai.enabled') ?? false;
  }
  get deepseekApiKey(): string | undefined {
    return this.configService.get<string>('ai.deepseek.apiKey');
  }
  get deepseekApiUrl(): string {
    return (
      this.configService.get<string>('ai.deepseek.apiUrl') ??
      'https://api.deepseek.com/v1'
    );
  }
  get deepseekModel(): string {
    return (
      this.configService.get<string>('ai.deepseek.model') ?? 'deepseek-chat'
    );
  }
  get deepseekMaxTokens(): number {
    return this.configService.get<number>('ai.deepseek.maxTokens') ?? 2000;
  }
  get deepseekTemperature(): number {
    return this.configService.get<number>('ai.deepseek.temperature') ?? 0.7;
  }
  get deepseekRequestTimeout(): number {
    return (
      this.configService.get<number>('ai.deepseek.requestTimeout') ?? 30000
    );
  }
  get deepseekMonthlyBudget(): number {
    return this.configService.get<number>('ai.deepseek.monthlyBudget') ?? 2;
  }
  get deepseekRateLimitMinTime(): number {
    return (
      this.configService.get<number>('ai.deepseek.rateLimitMinTime') ?? 600
    );
  }
  get deepseekRateLimitMaxConcurrent(): number {
    return (
      this.configService.get<number>('ai.deepseek.rateLimitMaxConcurrent') ?? 5
    );
  }
}
