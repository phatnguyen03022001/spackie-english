// src/infrastructure/third-party/google-tts.client.ts
import { Injectable } from '@nestjs/common';
import { TTSConfigService } from '@config/services/tts-config.service';
import { LoggerService } from '@common/logger/logger.service';
import { BaseApiClient } from '@infrastructure/third-party/base.client';

/**
 * Interface cho TTS client – abstraction để dễ mock trong test.
 */
export interface ITtsClient {
  synthesize(text: string): Promise<Buffer | null>;
}

/**
 * Interface mô tả shape của TextToSpeechClient từ @google-cloud/text-to-speech.
 * Dùng interface riêng thay vì import type từ package để tránh lỗi
 * @typescript-eslint/no-redundant-type-constituents (package type bị coi là error type).
 */
interface ITextToSpeechClient {
  synthesizeSpeech(request: {
    input: { text: string };
    voice: { languageCode: string; name: string };
    audioConfig: { audioEncoding: string; speakingRate: number };
  }): Promise<
    [
      { audioContent?: Buffer | Uint8Array | string },
      Record<string, unknown> | undefined,
      Record<string, unknown> | undefined,
    ]
  >;
}

@Injectable()
export class GoogleTtsClient implements ITtsClient {
  private readonly logger: LoggerService;
  private client: ITextToSpeechClient | null = null;
  private readonly retries: number;
  private readonly retryDelay: number;

  constructor(
    private config: TTSConfigService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(GoogleTtsClient.name);
    this.retries = 3;
    this.retryDelay = 1000;

    const apiKey = this.config.apiKey;
    if (apiKey) {
      // Dynamic import để tránh lỗi type từ @google-cloud/text-to-speech
      // (package không có @types đầy đủ, TextToSpeechClient bị coi là error type)
      void this.initClient(apiKey);
    } else {
      this.logger.warn(
        'Google TTS API key missing – audio generation disabled',
      );
    }
  }

  private async initClient(apiKey: string): Promise<void> {
    try {
      const { TextToSpeechClient } =
        await import('@google-cloud/text-to-speech');
      this.client = new TextToSpeechClient({
        apiKey,
      }) as unknown as ITextToSpeechClient;
    } catch (err) {
      this.logger.warn(
        `Failed to initialize TTS client: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async synthesize(text: string): Promise<Buffer | null> {
    if (!this.client) return null;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const request = {
          input: { text },
          voice: {
            languageCode: this.config.language,
            name: this.config.voice,
          },
          audioConfig: {
            audioEncoding: 'MP3' as const,
            speakingRate: this.config.speed,
          },
        };

        const [response] = await this.client.synthesizeSpeech(request);
        const audioContent = response?.audioContent;

        if (!audioContent) return null;

        // Chuyển đổi Uint8Array thành Buffer an toàn
        if (Buffer.isBuffer(audioContent)) {
          return audioContent;
        }
        if (audioContent instanceof Uint8Array) {
          return Buffer.from(audioContent);
        }
        // Nếu là string (base64) - rất hiếm
        return null;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.retries) {
          const delay = this.retryDelay * attempt;
          this.logger.warn(
            `TTS attempt ${attempt}/${this.retries} failed for "${text}": ${lastError.message}. Retrying in ${delay}ms...`,
          );
          await this.delay(delay);
        }
      }
    }

    this.logger.error(
      `TTS failed for "${text}" after ${this.retries} attempts: ${lastError?.message}`,
    );
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
