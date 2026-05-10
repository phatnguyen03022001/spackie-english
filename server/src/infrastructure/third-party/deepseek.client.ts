import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseApiClient } from '@infrastructure/third-party/base.client';
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

    const minTime =
      configService.get<number>('ai.deepseek.rateLimitMinTime') ?? 600;
    const maxConcurrent =
      configService.get<number>('ai.deepseek.rateLimitMaxConcurrent') ?? 5;
    this.limiter = new Bottleneck({ minTime, maxConcurrent });
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

  /**
   * Optimized short chat for card enrichment.
   * Returns rich meaning data including pronunciation, part of speech, synonyms, antonyms,
   * and exactly 2 example sentences.
   * Uses minimal tokens and lower temperature for faster, more predictable JSON output.
   */
  async chatShort(word: string): Promise<{
    vi: string;
    examples: string[];
    pronounce: string;
    pos: string;
    synonyms: string;
    antonyms: string;
  }> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: `You are a Vietnamese-English tutor. Return ONLY valid JSON (no extra text, no markdown).

The JSON must have exactly the following structure:
{
  "vi": "nghĩa tiếng Việt (1-2 từ ngắn gọn)",
  "examples": [
    "English sentence 1. (Vietnamese translation 1)",
    "English sentence 2. (Vietnamese translation 2)"
  ],
  "pronounce": "IPA pronunciation, e.g., /ˈkrɪmzən/",
  "pos": "part of speech (noun, verb, adjective, adverb, preposition, conjunction, interjection)",
  "synonyms": "1-2 synonyms separated by comma, or empty string",
  "antonyms": "1-2 antonyms separated by comma, or empty string"
}

Requirements:
- Each example must contain an English sentence followed by a Vietnamese translation in parentheses.
- The two examples must be different and illustrate different contexts of the word.
- Keep total token usage minimal (under 350 tokens).
- If unsure about synonyms/antonyms, use empty string.`,
      },
      { role: 'user', content: word },
    ];

    const response = await this.chat(messages, {
      max_tokens: 350,
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(response) as {
        vi: string;
        examples: string[];
        pronounce: string;
        pos: string;
        synonyms: string;
        antonyms: string;
      };
      return {
        vi: parsed.vi || response,
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
        pronounce: parsed.pronounce || '',
        pos: parsed.pos || '',
        synonyms: parsed.synonyms || '',
        antonyms: parsed.antonyms || '',
      };
    } catch {
      // Fallback: return raw response as meaning
      return {
        vi: response,
        examples: [],
        pronounce: '',
        pos: '',
        synonyms: '',
        antonyms: '',
      };
    }
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
