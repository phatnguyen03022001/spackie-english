import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@common/logger/logger.service';
import { PinoLogger } from 'nestjs-pino';

describe('LoggerService', () => {
  let service: LoggerService;
  let mockPinoLogger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    mockPinoLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      error: jest.fn(),
      setContext: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
      ],
    }).compile();

    // LoggerService is a scoped provider, use resolve() instead of get()
    service = await module.resolve(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setContext', () => {
    it('should delegate to pino logger setContext', () => {
      service.setContext('TestContext');
      expect(mockPinoLogger.setContext).toHaveBeenCalledWith('TestContext');
    });
  });

  describe('log', () => {
    it('should delegate to pino logger info', () => {
      service.log('test message');
      expect(mockPinoLogger.info).toHaveBeenCalledWith('test message');
    });
  });

  describe('info', () => {
    it('should delegate to pino logger info', () => {
      service.info('info message');
      expect(mockPinoLogger.info).toHaveBeenCalledWith('info message');
    });
  });

  describe('warn', () => {
    it('should delegate to pino logger warn', () => {
      service.warn('warning message');
      expect(mockPinoLogger.warn).toHaveBeenCalledWith('warning message');
    });
  });

  describe('debug', () => {
    it('should delegate to pino logger debug', () => {
      service.debug('debug message');
      expect(mockPinoLogger.debug).toHaveBeenCalledWith('debug message');
    });
  });

  describe('verbose', () => {
    it('should delegate to pino logger trace', () => {
      service.verbose('verbose message');
      expect(mockPinoLogger.trace).toHaveBeenCalledWith('verbose message');
    });
  });

  describe('error', () => {
    it('should handle Error object with stack', () => {
      const error = new Error('Something went wrong');
      service.error(error);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        {
          err: error,
          stack: error.stack,
          context: undefined,
        },
        error.message,
      );
    });

    it('should handle string message', () => {
      service.error('Error message');

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        {
          err: 'Error message',
          stack: undefined,
          context: undefined,
        },
        'Error message',
      );
    });

    it('should handle error with stack and context', () => {
      const error = new Error('Test error');
      service.error(error, error.stack, 'TestContext');

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        {
          err: error,
          stack: error.stack,
          context: 'TestContext',
        },
        error.message,
      );
    });
  });
});
