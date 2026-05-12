import { Test, TestingModule } from '@nestjs/testing';
import { GoogleTtsClient } from '@infrastructure/third-party/google-tts.client';
import { TTSConfigService } from '@config/services/tts-config.service';
import { LoggerService } from '@common/logger/logger.service';

describe('GoogleTtsClient', () => {
  let client: GoogleTtsClient;
  let mockTtsConfig: jest.Mocked<TTSConfigService>;
  let mockTextToSpeechClient: any;

  beforeEach(async () => {
    mockTtsConfig = {
      apiKey: '',
      language: 'en-US',
      voice: 'en-US-Standard-A',
      speed: 1.0,
    } as any;

    mockTextToSpeechClient = {
      synthesizeSpeech: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: GoogleTtsClient,
          useFactory: () => {
            const svc = new GoogleTtsClient(mockTtsConfig, mockLogger as any);
            // Set client directly after construction (initClient won't run since apiKey is empty)
            (svc as any).client = mockTextToSpeechClient;
            return svc;
          },
        },
      ],
    }).compile();

    client = module.get(GoogleTtsClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('synthesize', () => {
    it('should return Buffer when audio content is available', async () => {
      const audioBuffer = Buffer.from('audio-data');
      mockTextToSpeechClient.synthesizeSpeech.mockResolvedValue([
        { audioContent: audioBuffer },
        undefined,
        undefined,
      ]);

      const result = await client.synthesize('Hello');

      expect(result).toBeInstanceOf(Buffer);
      expect(result!.toString()).toBe('audio-data');
      expect(mockTextToSpeechClient.synthesizeSpeech).toHaveBeenCalledWith({
        input: { text: 'Hello' },
        voice: { languageCode: 'en-US', name: 'en-US-Standard-A' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
      });
    });

    it('should return null if no audio content', async () => {
      mockTextToSpeechClient.synthesizeSpeech.mockResolvedValue([
        { audioContent: null },
        undefined,
        undefined,
      ]);

      const result = await client.synthesize('Hello');
      expect(result).toBeNull();
    });

    it('should return null if client is not initialized', async () => {
      (client as any).client = null;
      const result = await client.synthesize('Hello');
      expect(result).toBeNull();
    });

    it('should handle Uint8Array audio content', async () => {
      const uint8 = new Uint8Array([104, 101, 108, 108, 111]);
      mockTextToSpeechClient.synthesizeSpeech.mockResolvedValue([
        { audioContent: uint8 },
        undefined,
        undefined,
      ]);

      const result = await client.synthesize('Hello');
      expect(result).toBeInstanceOf(Buffer);
      expect(result!.toString()).toBe('hello');
    });

    it('should return null on API error', async () => {
      mockTextToSpeechClient.synthesizeSpeech.mockRejectedValue(
        new Error('API error'),
      );

      const result = await client.synthesize('Hello');
      expect(result).toBeNull();
    });
  });
});
