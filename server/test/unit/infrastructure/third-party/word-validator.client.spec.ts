import { Test, TestingModule } from '@nestjs/testing';
import { WordValidatorClient } from '@infrastructure/third-party/word-validator.client';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { LoggerService } from '@common/logger/logger.service';

describe('WordValidatorClient', () => {
  let client: WordValidatorClient;
  let deepSeekClient: jest.Mocked<DeepSeekClient>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordValidatorClient,
        {
          provide: DeepSeekClient,
          useValue: {
            chat: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    client = module.get(WordValidatorClient);
    deepSeekClient = module.get(DeepSeekClient);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateWord', () => {
    it('should return valid for a correct English word', async () => {
      deepSeekClient.chat.mockResolvedValue(
        JSON.stringify({ isValid: true, correction: '', reason: '' }),
      );

      const result = await client.validateWord('hello');

      expect(result.isValid).toBe(true);
      expect(result.correction).toBeUndefined();
      expect(result.reason).toBeUndefined();
    });

    it('should return invalid with correction for a misspelled word', async () => {
      deepSeekClient.chat.mockResolvedValue(
        JSON.stringify({
          isValid: false,
          correction: 'beautiful',
          reason: 'Common misspelling of "beautiful"',
        }),
      );

      const result = await client.validateWord('beutiful');

      expect(result.isValid).toBe(false);
      expect(result.correction).toBe('beautiful');
      expect(result.reason).toBe('Common misspelling of "beautiful"');
    });

    it('should return invalid for very short strings (single char)', async () => {
      const result = await client.validateWord('a');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Word must be at least 2 characters long');
      expect(deepSeekClient.chat).not.toHaveBeenCalled();
    });

    it('should return invalid for purely numeric strings', async () => {
      const result = await client.validateWord('12345');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Numeric strings are not valid English words');
      expect(deepSeekClient.chat).not.toHaveBeenCalled();
    });

    it('should fallback to valid when DeepSeek API fails', async () => {
      deepSeekClient.chat.mockRejectedValue(new Error('API timeout'));

      const result = await client.validateWord('hello');

      expect(result.isValid).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('API timeout'),
      );
    });

    it('should fallback to valid when DeepSeek returns invalid JSON', async () => {
      deepSeekClient.chat.mockResolvedValue('not json at all');

      const result = await client.validateWord('hello');

      expect(result.isValid).toBe(true);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions gracefully', async () => {
      deepSeekClient.chat.mockRejectedValue('string error');

      const result = await client.validateWord('hello');

      expect(result.isValid).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('string error'),
      );
    });

    it('should normalize word to lowercase before validation', async () => {
      deepSeekClient.chat.mockResolvedValue(
        JSON.stringify({ isValid: true, correction: '', reason: '' }),
      );

      await client.validateWord('HELLO');

      // The prompt should contain the normalized (lowercase) word
      const promptArg = deepSeekClient.chat.mock.calls[0][0][0].content;
      expect(promptArg).toContain('"hello"');
      expect(promptArg).not.toContain('"HELLO"');
    });

    it('should trim whitespace from input', async () => {
      deepSeekClient.chat.mockResolvedValue(
        JSON.stringify({ isValid: true, correction: '', reason: '' }),
      );

      await client.validateWord('  hello  ');

      const promptArg = deepSeekClient.chat.mock.calls[0][0][0].content;
      expect(promptArg).toContain('"hello"');
    });

    it('should validate phrases and collocations', async () => {
      deepSeekClient.chat.mockResolvedValue(
        JSON.stringify({
          isValid: true,
          correction: '',
          reason: '',
        }),
      );

      const result = await client.validateWord('break a leg');

      expect(result.isValid).toBe(true);
    });

    it('should use low temperature for deterministic results', async () => {
      deepSeekClient.chat.mockResolvedValue(
        JSON.stringify({ isValid: true, correction: '', reason: '' }),
      );

      await client.validateWord('hello');

      expect(deepSeekClient.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ temperature: 0, max_tokens: 100 }),
      );
    });
  });
});
