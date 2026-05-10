// src/infrastructure/third-party/word-validator.client.ts
import { Injectable } from '@nestjs/common';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { LoggerService } from '@common/logger/logger.service';

export interface WordValidationResult {
  isValid: boolean;
  correction?: string;
  reason?: string;
}

@Injectable()
export class WordValidatorClient {
  constructor(
    private readonly deepSeekClient: DeepSeekClient,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(WordValidatorClient.name);
  }

  /**
   * Validate if a given string is a valid English word, phrase, or collocation
   * (including idioms, phrasal verbs).
   * Uses DeepSeek API with a lightweight prompt for fast validation.
   */
  async validateWord(word: string): Promise<WordValidationResult> {
    const normalizedWord = word.trim().toLowerCase();

    // Quick check: skip validation for very short strings (single chars)
    if (normalizedWord.length < 2) {
      return {
        isValid: false,
        reason: 'Word must be at least 2 characters long',
      };
    }

    // Skip validation for strings that are purely numeric
    if (/^\d+$/.test(normalizedWord)) {
      return {
        isValid: false,
        reason: 'Numeric strings are not valid English words',
      };
    }

    const prompt = `You are an English word validator. Determine if "${normalizedWord}" is a valid English word, phrase, or collocation (including idioms, phrasal verbs, and common expressions). Return ONLY valid JSON (no extra text, no markdown): {"isValid": true/false, "correction": "suggested correct word if applicable, otherwise empty string", "reason": "brief explanation if invalid, otherwise empty string"}. Do not include any extra text.`;

    try {
      const response = await this.deepSeekClient.chat(
        [{ role: 'user', content: prompt }],
        { max_tokens: 100, temperature: 0 },
      );

      const parsed = JSON.parse(response) as WordValidationResult;
      return {
        isValid: parsed.isValid ?? true,
        correction: parsed.correction || undefined,
        reason: parsed.reason || undefined,
      };
    } catch (error) {
      // Fallback: if DeepSeek fails, assume valid to avoid blocking card creation
      this.logger.warn(
        `Word validation failed for "${normalizedWord}", falling back to valid: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { isValid: true };
    }
  }
}
