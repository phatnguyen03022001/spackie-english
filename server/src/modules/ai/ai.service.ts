// src/modules/ai/ai.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiRepository } from '@modules/ai/ai.repository';
import {
  AiUsageResponseDto,
  DailyUsageDto,
  QuotaResponseDto,
} from '@modules/ai/dto/ai-usage-response.dto';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { AI_EVENTS } from '@common/constants/events.constants';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AiService {
  private readonly domain = 'ai';
  private readonly defaultMonthlyLimitCents = 500; // $5 default monthly limit

  constructor(
    private readonly repository: AiRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  /**
   * Get detailed explanation of a word using AI.
   */
  async explainWord(
    userId: string,
    word: string,
  ): Promise<{
    word: string;
    pronunciation: string;
    partOfSpeech: string;
    definition: string;
    examples: string[];
    synonyms: string[];
    antonyms: string[];
  }> {
    await this.checkQuota(userId);

    // Record AI usage (simplified – in production, call external AI API)
    await this.record({
      userId,
      operation: 'explain',
      inputTokens: word.length,
      outputTokens: 200,
      cost: 1,
    });

    // In production, call DeepSeek API to get real explanation
    return {
      word,
      pronunciation: `/${word.toLowerCase()}/`,
      partOfSpeech: 'unknown',
      definition: `Definition of "${word}"`,
      examples: [`Example sentence using "${word}".`],
      synonyms: [],
      antonyms: [],
    };
  }

  /**
   * Get example sentences for a word using AI.
   */
  async getExamples(
    userId: string,
    word: string,
    count: number,
  ): Promise<{
    word: string;
    count: number;
    examples: Array<{ sentence: string; translation?: string }>;
  }> {
    await this.checkQuota(userId);

    await this.record({
      userId,
      operation: 'examples',
      inputTokens: word.length,
      outputTokens: count * 50,
      cost: 1,
    });

    const examples = Array.from({ length: count }, (_, i) => ({
      sentence: `Example ${i + 1} using "${word}".`,
      translation: `Bản dịch ví dụ ${i + 1}.`,
    }));

    return { word, count, examples };
  }

  /**
   * Translate text using AI.
   */
  async translate(
    userId: string,
    text: string,
    sourceLang?: string,
    targetLang?: string,
  ): Promise<{
    translatedText: string;
    sourceLang: string;
    targetLang: string;
  }> {
    await this.checkQuota(userId);

    await this.record({
      userId,
      operation: 'translate',
      inputTokens: text.length,
      outputTokens: text.length,
      cost: 1,
    });

    const src = sourceLang || 'en';
    const tgt = targetLang || 'vi';

    return {
      translatedText: `[Translated] ${text}`,
      sourceLang: src,
      targetLang: tgt,
    };
  }

  /**
   * Get pronunciation feedback for a word/phrase.
   */
  async getPronunciationFeedback(
    userId: string,
    text: string,
    _userAudioBase64?: string,
  ): Promise<{
    text: string;
    phonetic: string;
    feedback: string;
    difficulty: number;
    referenceAudioUrl?: string;
  }> {
    await this.checkQuota(userId);

    await this.record({
      userId,
      operation: 'pronunciation',
      inputTokens: text.length,
      outputTokens: 100,
      cost: 1,
    });

    return {
      text,
      phonetic: `/${text.toLowerCase()}/`,
      feedback: `Practice the word "${text}" syllable by syllable.`,
      difficulty: 3,
      referenceAudioUrl: undefined,
    };
  }

  /**
   * Record an AI usage event.
   */
  async record(data: {
    userId: string;
    operation: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }): Promise<void> {
    await this.repository.create(data);

    // Invalidate usage cache
    await this.cacheManager.delPattern(
      CacheKeyBuilder.listPattern(this.domain, data.userId),
    );
    await this.cacheManager.delPattern(`${this.domain}:quota:${data.userId}:*`);

    this.eventEmitter.emit(AI_EVENTS.USAGE_RECORDED, data);
  }

  /**
   * Get user's AI usage stats.
   */
  async getUsage(userId: string): Promise<AiUsageResponseDto> {
    const cacheKey = `${this.domain}:${userId}:usage`;
    const cached = await this.cacheManager.get<AiUsageResponseDto>(cacheKey);
    if (cached) return cached;

    // Get current month range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const [aggregated, dailyUsage] = await Promise.all([
      this.repository.getUserAggregation(userId, startOfMonth, endOfMonth),
      this.repository.getDailyUsage(userId, startOfMonth, endOfMonth),
    ]);

    const result = plainToInstance(AiUsageResponseDto, {
      totalRequests:
        aggregated.totalInputTokens + aggregated.totalOutputTokens > 0 ? 1 : 0,
      totalTokens: aggregated.totalInputTokens + aggregated.totalOutputTokens,
      totalCost: aggregated.totalCost,
      dailyUsage: dailyUsage.map(
        (d) =>
          new DailyUsageDto({
            date: d.date,
            requests: d.requests,
            tokens: d.tokens,
            cost: d.cost,
          }),
      ),
    });

    await this.cacheManager.set(cacheKey, result, CACHE_TTL.SHORT);
    return result;
  }

  /**
   * Get user's remaining quota for the current period.
   */
  async getQuota(userId: string): Promise<QuotaResponseDto> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cacheKey = `${this.domain}:quota:${userId}:${yearMonth}`;

    const cached = await this.cacheManager.get<QuotaResponseDto>(cacheKey);
    if (cached) return cached;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const aggregated = await this.repository.getUserAggregation(
      userId,
      startOfMonth,
      endOfMonth,
    );

    // Get user's monthly limit (from Redis or default)
    const limitKey = `${this.domain}:limit:${userId}`;
    let monthlyLimit = await this.cacheManager.get<number>(limitKey);
    if (monthlyLimit === null || monthlyLimit === undefined) {
      monthlyLimit = this.defaultMonthlyLimitCents;
    }

    const result = plainToInstance(QuotaResponseDto, {
      monthlyLimit,
      usedThisMonth: aggregated.totalCost,
      remaining: Math.max(0, monthlyLimit - aggregated.totalCost),
      resetDate: endOfMonth.toISOString(),
    });

    await this.cacheManager.set(cacheKey, result, 3600); // 1 hour TTL
    return result;
  }

  /**
   * Check if user has quota remaining. Throws if exceeded.
   */
  async checkQuota(userId: string): Promise<void> {
    const quota = await this.getQuota(userId);
    if (quota.remaining <= 0) {
      throw new BusinessException(
        HttpStatus.TOO_MANY_REQUESTS,
        ERROR_CODES.AI_QUOTA_EXCEEDED,
        `AI quota exceeded. Reset on ${quota.resetDate}`,
      );
    }
  }

  /**
   * Get admin aggregate AI usage across all users.
   */
  async getAdminUsage(): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    uniqueUsers: number;
  }> {
    const cacheKey = `${this.domain}:admin:usage`;
    const cached = await this.cacheManager.get<{
      totalRequests: number;
      totalTokens: number;
      totalCost: number;
      uniqueUsers: number;
    }>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const totalCost = await this.repository.getTotalSystemCost(
      startOfMonth,
      endOfMonth,
    );

    const result = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost,
      uniqueUsers: 0,
    };

    await this.cacheManager.set(cacheKey, result, 600); // 10 min TTL
    return result;
  }

  /**
   * Update a user's monthly quota limit (admin).
   */
  async updateQuota(userId: string, monthlyLimitCents: number): Promise<void> {
    const limitKey = `${this.domain}:limit:${userId}`;
    await this.cacheManager.set(limitKey, monthlyLimitCents, 0); // No expiry (persistent)

    // Invalidate quota cache
    await this.cacheManager.delPattern(`${this.domain}:quota:${userId}:*`);

    this.eventEmitter.emit(AI_EVENTS.QUOTA_UPDATED, {
      userId,
      monthlyLimitCents,
    });
  }
}
