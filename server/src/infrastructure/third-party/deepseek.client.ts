import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseApiClient } from './base.client';
import { LoggerService } from '@common/logger/logger.service';
import Bottleneck from 'bottleneck';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  max_tokens?: number;
  temperature?: number;
}

interface DeepSeekResponseChoice {
  index: number;
  message: DeepSeekMessage;
  finish_reason: string;
}

interface DeepSeekResponse {
  id: string;
  choices: DeepSeekResponseChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class DeepSeekClient extends BaseApiClient {
  private readonly model: string;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;
  private readonly apiKey: string;
  private readonly limiter: Bottleneck;

  constructor(configService: ConfigService, logger: LoggerService) {
    const apiKey = configService.get<string>('ai.deepseek.apiKey');
    const apiUrl =
      configService.get<string>('ai.deepseek.apiUrl') ||
      'https://api.deepseek.com/v1';
    const timeout =
      configService.get<number>('ai.deepseek.requestTimeout') || 30000;
    super(apiUrl, timeout, logger, 3, 2000, true, 'DeepSeek');

    if (!apiKey) throw new Error('DeepSeek API key is required');
    this.apiKey = apiKey;
    this.model =
      configService.get<string>('ai.deepseek.model') || 'deepseek-chat';
    this.defaultMaxTokens =
      configService.get<number>('ai.deepseek.maxTokens') || 2000;
    this.defaultTemperature =
      configService.get<number>('ai.deepseek.temperature') || 0.7;

    // Read rate limit config from environment (with fallback defaults)
    const minTime =
      configService.get<number>('ai.deepseek.rateLimitMinTime') ?? 600;
    const maxConcurrent =
      configService.get<number>('ai.deepseek.rateLimitMaxConcurrent') ?? 5;

    this.limiter = new Bottleneck({
      minTime, // milliseconds between requests
      maxConcurrent,
    });
  }

  async chat(
    messages: DeepSeekMessage[],
    options?: Partial<DeepSeekRequest>,
  ): Promise<string> {
    const request: DeepSeekRequest = {
      model: options?.model || this.model,
      messages,
      max_tokens: options?.max_tokens || this.defaultMaxTokens,
      temperature: options?.temperature ?? this.defaultTemperature,
    };

    return this.limiter.schedule(async () => {
      try {
        const response = await this.post<DeepSeekResponse>(
          '/chat/completions',
          request,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );
        return response.choices[0]?.message?.content || '';
      } catch (error) {
        this.logger.error({ error, messages }, 'DeepSeek chat failed');
        throw new Error('AI service unavailable');
      }
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.get('/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return true;
    } catch {
      return false;
    }
  }
}
