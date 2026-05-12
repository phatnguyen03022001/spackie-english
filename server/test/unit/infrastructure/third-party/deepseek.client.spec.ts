import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { LoggerService } from '@common/logger/logger.service';
import axios from 'axios';

jest.mock('axios');

describe('DeepSeekClient', () => {
  let client: DeepSeekClient;
  let logger: jest.Mocked<LoggerService>;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeepSeekClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ai.deepseek.apiKey') return 'test-api-key';
              if (key === 'ai.deepseek.apiUrl')
                return 'https://api.deepseek.com/v1';
              if (key === 'ai.deepseek.requestTimeout') return 30000;
              if (key === 'ai.deepseek.model') return 'deepseek-chat';
              if (key === 'ai.deepseek.maxTokens') return 2000;
              if (key === 'ai.deepseek.temperature') return 0.7;
              if (key === 'ai.deepseek.rateLimitMinTime') return 600;
              if (key === 'ai.deepseek.rateLimitMaxConcurrent') return 5;
              return null;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    client = module.get(DeepSeekClient);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should return content from DeepSeek response', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        },
      });

      const result = await client.chat([
        { role: 'user', content: 'Say hello' },
      ]);

      expect(result).toBe('Hello!');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Say hello' }],
        }),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should return empty string if no choices', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { choices: [], usage: {} },
      });

      const result = await client.chat([{ role: 'user', content: 'Hi' }]);
      expect(result).toBe('');
    });

    it('should throw AI service unavailable on error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API error'));

      await expect(
        client.chat([{ role: 'user', content: 'Hi' }]),
      ).rejects.toThrow('AI service unavailable');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('chatShort', () => {
    it('should parse JSON response and return structured data', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  vi: 'xin chào',
                  examples: ['Hello, how are you? (Xin chào, bạn khỏe không?)'],
                  pronounce: '/həˈloʊ/',
                  pos: 'interjection',
                  synonyms: 'hi, hey',
                  antonyms: 'bye',
                }),
              },
              finish_reason: 'stop',
            },
          ],
          usage: {},
        },
      });

      const result = await client.chatShort('hello');

      expect(result).toEqual({
        vi: 'xin chào',
        examples: ['Hello, how are you? (Xin chào, bạn khỏe không?)'],
        pronounce: '/həˈloʊ/',
        pos: 'interjection',
        synonyms: 'hi, hey',
        antonyms: 'bye',
      });
    });

    it('should fallback to raw response if JSON parse fails', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: { role: 'assistant', content: 'raw response text' },
              finish_reason: 'stop',
            },
          ],
          usage: {},
        },
      });

      const result = await client.chatShort('hello');

      expect(result).toEqual({
        vi: 'raw response text',
        examples: [],
        pronounce: '',
        pos: '',
        synonyms: '',
        antonyms: '',
      });
    });
  });

  describe('ping', () => {
    it('should return true if API responds', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      const result = await client.ping();
      expect(result).toBe(true);
    });

    it('should return false if API fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      const result = await client.ping();
      expect(result).toBe(false);
    });
  });
});
