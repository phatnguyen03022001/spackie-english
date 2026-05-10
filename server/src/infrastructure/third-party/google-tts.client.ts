// src/infrastructure/third-party/google-tts.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { TTSConfigService } from '@config/services/tts-config.service';

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
  private readonly logger = new Logger(GoogleTtsClient.name);
  private client: ITextToSpeechClient | null = null;

  constructor(private config: TTSConfigService) {
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
      this.logger.error(
        `TTS failed for "${text}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
