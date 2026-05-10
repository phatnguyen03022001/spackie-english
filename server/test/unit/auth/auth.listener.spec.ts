import { Test, TestingModule } from '@nestjs/testing';
import { AuthListener } from '@modules/auth/auth.listener';
import { AuthService } from '@modules/auth/auth.service';
import { LoggerService } from '@common/logger/logger.service';

describe('AuthListener', () => {
  let listener: AuthListener;
  let authService: jest.Mocked<AuthService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthListener,
        {
          provide: AuthService,
          useValue: {
            sendVerificationOtp: jest.fn(),
            sendWelcomeEmail: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get(AuthListener);
    authService = module.get(AuthService);
    logger = module.get(LoggerService);
  });

  describe('handleUserCreated', () => {
    const payload = {
      userId: '123',
      email: 'test@example.com',
      displayName: 'Test',
    };

    it('should send verification OTP and welcome email on USER_EVENTS.CREATED', async () => {
      await listener.handleUserCreated(payload);

      expect(authService.sendVerificationOtp).toHaveBeenCalledWith(
        payload.email,
      );
      expect(authService.sendWelcomeEmail).toHaveBeenCalledWith(
        payload.email,
        payload.displayName,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Handling USER_EVENTS.CREATED for ${payload.email}`,
      );
    });

    it('should log error but not throw if sendVerificationOtp fails', async () => {
      const error = new Error('Quota exceeded');
      authService.sendVerificationOtp.mockRejectedValue(error);

      await expect(listener.handleUserCreated(payload)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to send verification OTP in listener: ${error.message}`,
      );
      expect(authService.sendWelcomeEmail).toHaveBeenCalled(); // still called
    });

    it('should log error but not throw if sendWelcomeEmail fails', async () => {
      const error = new Error('Mail service down');
      authService.sendWelcomeEmail.mockRejectedValue(error);

      await expect(listener.handleUserCreated(payload)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to send welcome email in listener: ${error.message}`,
      );
      expect(authService.sendVerificationOtp).toHaveBeenCalled(); // still called
    });

    it('should handle non-Error objects in catch', async () => {
      authService.sendVerificationOtp.mockRejectedValue('string error');
      await expect(listener.handleUserCreated(payload)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send verification OTP in listener: string error',
      );
    });
  });
});
