import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@modules/auth/auth.service';
import { UsersService } from '@modules/users/users.service';
import { UsersRepository } from '@modules/users/users.repository';
import { OtpRepository } from '@modules/auth/repositories/otp.repository';
import { AdminDeviceRepository } from '@modules/auth/repositories/admin-device.repository';
import { DeviceService } from '@modules/auth/device.service';
import { EmailQuotaService } from '@modules/auth/email-quota.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserMapper } from '@modules/users/mappers/user.mapper';
import { BusinessException } from '@common/filters/business.exception';
import { Role, AuthProvider } from '@prisma/client';
import { TwoFactorService } from '@modules/auth/two-factor.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';

jest.mock('bcrypt');
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mocked-uuid'),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-hash'),
  }),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let otpRepository: jest.Mocked<OtpRepository>;
  let deviceService: jest.Mocked<DeviceService>;
  let emailQuotaService: jest.Mocked<EmailQuotaService>;
  let mailService: jest.Mocked<MailService>;
  let jwtService: jest.Mocked<JwtService>;
  let cacheManager: jest.Mocked<ICacheManager>;
  let logger: jest.Mocked<LoggerService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed',
    role: Role.USER,
    provider: AuthProvider.LOCAL,
    providerId: null,
    avatarUrl: null,
    displayName: 'Test User',
    isActive: true,
    isVerified: true,
    isBanned: false,
    settings: {},
    totalCardsLearned: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStudiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockAdminUser = { ...mockUser, id: 'admin123', role: Role.ADMIN };
  const mockUserResponse = { id: 'user123', email: 'test@example.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { create: jest.fn(), findById: jest.fn() },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: OtpRepository,
          useValue: {
            findFirst: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
          },
        },
        {
          provide: AdminDeviceRepository,
          useValue: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: DeviceService,
          useValue: {
            findAllByUser: jest.fn(),
            addDevice: jest.fn(),
            removeDevice: jest.fn(),
            validateDevice: jest.fn(),
          },
        },
        {
          provide: EmailQuotaService,
          useValue: { canSend: jest.fn(), increment: jest.fn() },
        },
        {
          provide: MailService,
          useValue: { send: jest.fn(), ping: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('signed-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('secret') },
        },
        {
          provide: 'ICacheManager',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delPattern: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: UserMapper,
          useValue: {
            toResponseDto: jest.fn().mockReturnValue(mockUserResponse),
          },
        },
        {
          provide: TwoFactorService,
          useValue: {
            generateSecret: jest.fn(),
            verifyToken: jest.fn(),
            generateRecoveryCodes: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    usersRepository = module.get(UsersRepository);
    otpRepository = module.get(OtpRepository);
    deviceService = module.get(DeviceService);
    emailQuotaService = module.get(EmailQuotaService);
    mailService = module.get(MailService);
    jwtService = module.get(JwtService);
    cacheManager = module.get('ICacheManager');
    logger = module.get(LoggerService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call usersService.create with correct DTO', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'pass',
        name: 'New User',
      };
      usersService.create.mockResolvedValue(mockUserResponse as any);
      const result = await service.register(dto);
      expect(usersService.create).toHaveBeenCalledWith({
        email: dto.email,
        username: 'new',
        password: dto.password,
        displayName: dto.name,
      });
      expect(result).toEqual(mockUserResponse);
    });

    it('should throw BusinessException when user already exists', async () => {
      const dto = { email: 'exists@example.com', password: 'pass' };
      usersService.create.mockRejectedValue(
        new BusinessException(
          409,
          'USER_EMAIL_DUPLICATE',
          'Email already exists',
        ),
      );
      await expect(service.register(dto)).rejects.toThrow(BusinessException);
    });
  });

  describe('verifyEmail', () => {
    const dto = { email: 'test@example.com', otp: '123456' };
    const mockOtp = {
      id: 'otp1',
      otpHash: 'hashedOtp',
      type: 'VERIFY_EMAIL',
      expiresAt: new Date(Date.now() + 60000),
    };

    it('should throw if OTP not found or expired', async () => {
      otpRepository.findFirst.mockResolvedValue(null);
      await expect(service.verifyEmail(dto)).rejects.toThrow(BusinessException);
      expect(otpRepository.findFirst).toHaveBeenCalledWith(
        {
          email: dto.email,
          type: 'VERIFY_EMAIL',
          expiresAt: { gt: expect.any(Date) },
        },
        { createdAt: 'desc' },
      );
    });

    it('should throw if OTP does not match', async () => {
      otpRepository.findFirst.mockResolvedValue(mockOtp as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.verifyEmail(dto)).rejects.toThrow(BusinessException);
    });

    it('should throw if user not found', async () => {
      otpRepository.findFirst.mockResolvedValue(mockOtp as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersRepository.findByEmail.mockResolvedValue(null);
      await expect(service.verifyEmail(dto)).rejects.toThrow(BusinessException);
    });

    it('should succeed and update user isVerified, emit event, delete OTP', async () => {
      otpRepository.findFirst.mockResolvedValue(mockOtp as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);
      usersRepository.update.mockResolvedValue({
        ...mockUser,
        isVerified: true,
      } as any);
      otpRepository.delete.mockResolvedValue(undefined as any);
      await service.verifyEmail(dto);
      expect(usersRepository.update).toHaveBeenCalledWith(mockUser.id, {
        isVerified: true,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.email_verified', {
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(otpRepository.delete).toHaveBeenCalledWith(mockOtp.id);
    });
  });

  describe('resendVerification', () => {
    const dto = { email: 'test@example.com' };

    it('should do nothing if user not found (return 202 silently)', async () => {
      const sendSpy = jest.spyOn(service, 'sendVerificationOtp');
      usersRepository.findByEmail.mockResolvedValue(null);
      await service.resendVerification(dto);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Email not found'),
      );
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should do nothing if user already verified', async () => {
      const sendSpy = jest.spyOn(service, 'sendVerificationOtp');
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: true,
      } as any);
      await service.resendVerification(dto);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('already verified'),
      );
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should throw rate limit exceeded if more than 3 attempts per hour', async () => {
      const sendSpy = jest.spyOn(service, 'sendVerificationOtp');
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: false,
      } as any);
      cacheManager.get.mockResolvedValue(3);
      await expect(service.resendVerification(dto)).rejects.toThrow(
        BusinessException,
      );
      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should call sendVerificationOtp on success', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: false,
      } as any);
      cacheManager.get.mockResolvedValue(null);
      const sendSpy = jest
        .spyOn(service, 'sendVerificationOtp')
        .mockResolvedValue();
      await service.resendVerification(dto);
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('verify:resend:'),
        1,
        3600,
      );
      expect(sendSpy).toHaveBeenCalledWith(dto.email);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'pass' };

    it('should return tokens and user when credentials valid (regular user)', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('access-token');
      const generateTokensSpy = jest
        .spyOn(service as any, 'generateTokens')
        .mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
      const result = await service.login(loginDto);
      expect(generateTokensSpy).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.role,
        expect.any(String),
      );
      expect(result.accessToken).toBe('at');
    });

    it('should throw if user not found or no passwordHash', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(BusinessException);
    });

    it('should throw if user not verified', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: false,
      } as any);
      await expect(service.login(loginDto)).rejects.toThrow(BusinessException);
    });

    it('should throw if user is banned', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isBanned: true,
      } as any);
      await expect(service.login(loginDto)).rejects.toThrow(BusinessException);
    });

    it('should throw if password incorrect', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(loginDto)).rejects.toThrow(BusinessException);
    });

    it('should throw if admin login missing deviceId', async () => {
      const adminDto = { email: 'admin@example.com', password: 'pass' };
      usersRepository.findByEmail.mockResolvedValue({
        ...mockAdminUser,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.login(adminDto)).rejects.toThrow(BusinessException);
    });

    it('should throw if admin login with invalid deviceId', async () => {
      const adminDto = {
        email: 'admin@example.com',
        password: 'pass',
        deviceId: 'invalid',
      };
      usersRepository.findByEmail.mockResolvedValue({
        ...mockAdminUser,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      deviceService.validateDevice.mockResolvedValue(false);
      await expect(service.login(adminDto)).rejects.toThrow(BusinessException);
    });

    it('should succeed for admin with valid deviceId', async () => {
      const adminDto = {
        email: 'admin@example.com',
        password: 'pass',
        deviceId: 'valid-device',
      };
      usersRepository.findByEmail.mockResolvedValue({
        ...mockAdminUser,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      deviceService.validateDevice.mockResolvedValue(true);
      const generateTokensSpy = jest
        .spyOn(service as any, 'generateTokens')
        .mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
      const result = await service.login(adminDto);
      expect(generateTokensSpy).toHaveBeenCalledWith(
        mockAdminUser.id,
        mockAdminUser.email,
        mockAdminUser.role,
        'valid-device',
      );
      expect(result.accessToken).toBe('at');
    });

    it('should generate randomUUID for regular user deviceId', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const generateTokensSpy = jest
        .spyOn(service as any, 'generateTokens')
        .mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
      await service.login(loginDto);
      expect(generateTokensSpy).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        mockUser.role,
        'mocked-uuid',
      );
      expect(randomUUID).toHaveBeenCalled();
    });

    it('should throw if user has no passwordHash (OAuth)', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      } as any);
      await expect(service.login(loginDto)).rejects.toThrow(BusinessException);
    });
  });

  describe('refresh', () => {
    const refreshToken = 'some-refresh-token';
    const payload = { sub: 'user123', deviceId: 'device1' };
    const mockUserFresh = { ...mockUser };

    it('should throw if refresh token not found in Redis', async () => {
      jwtService.verify.mockReturnValue(payload);
      cacheManager.get.mockResolvedValue(null);
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should revoke all sessions and throw if hash mismatch', async () => {
      jwtService.verify.mockReturnValue(payload);
      cacheManager.get.mockResolvedValue('stored-hash');
      // Mock crypto.createHash to return a different hash
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('different-hash'),
      };
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);
      const revokeSpy = jest.spyOn(service as any, 'revokeAllUserSessions');
      cacheManager.del.mockResolvedValue(undefined);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        BusinessException,
      );
      expect(revokeSpy).toHaveBeenCalledWith(payload.sub);
    });

    it('should throw if user not found or banned/deleted', async () => {
      jwtService.verify.mockReturnValue(payload);
      cacheManager.get.mockResolvedValue('hash');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash'),
      };
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);
      cacheManager.del.mockResolvedValue(undefined);
      usersRepository.findById.mockResolvedValue(null);
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should generate new tokens on success', async () => {
      jwtService.verify.mockReturnValue(payload);
      cacheManager.get.mockResolvedValue('hash');
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash'),
      };
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);
      cacheManager.del.mockResolvedValue(undefined);
      usersRepository.findById.mockResolvedValue(mockUserFresh as any);
      const generateTokensSpy = jest
        .spyOn(service as any, 'generateTokens')
        .mockResolvedValue({ accessToken: 'new-at', refreshToken: 'new-rt' });
      const result = await service.refresh(refreshToken);
      expect(generateTokensSpy).toHaveBeenCalledWith(
        mockUserFresh.id,
        mockUserFresh.email,
        mockUserFresh.role,
        payload.deviceId,
      );
      expect(result).toEqual({ accessToken: 'new-at', refreshToken: 'new-rt' });
    });
  });

  describe('logout', () => {
    const refreshToken = 'rt';
    it('should delete key from cache if token valid', async () => {
      const payload = { sub: 'user123', deviceId: 'dev1' };
      jwtService.verify.mockReturnValue(payload);
      cacheManager.del.mockResolvedValue(undefined);
      await service.logout(refreshToken);
      expect(cacheManager.del).toHaveBeenCalledWith(
        `auth:refresh:${payload.sub}:${payload.deviceId}`,
      );
    });

    it('should catch error and do nothing if token invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error();
      });
      await expect(service.logout(refreshToken)).resolves.not.toThrow();
      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('logoutAll', () => {
    it('should call revokeAllUserSessions', async () => {
      const revokeSpy = jest.spyOn(service as any, 'revokeAllUserSessions');
      cacheManager.del.mockResolvedValue(undefined);

      await service.logoutAll('user123');
      expect(revokeSpy).toHaveBeenCalledWith('user123');
    });
  });

  describe('changePassword', () => {
    const dto = { oldPassword: 'old', newPassword: 'new' };
    it('should throw if user has no passwordHash', async () => {
      usersRepository.findById.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      } as any);
      await expect(service.changePassword('user123', dto)).rejects.toThrow(
        BusinessException,
      );
    });
    it('should throw if old password incorrect', async () => {
      usersRepository.findById.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.changePassword('user123', dto)).rejects.toThrow(
        BusinessException,
      );
    });
    it('should update hash and revoke all sessions on success', async () => {
      usersRepository.findById.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHash');
      usersRepository.update.mockResolvedValue({} as any);
      const revokeSpy = jest.spyOn(service as any, 'revokeAllUserSessions');
      cacheManager.del.mockResolvedValue(undefined);
      await service.changePassword('user123', dto);
      expect(usersRepository.update).toHaveBeenCalledWith('user123', {
        passwordHash: 'newHash',
      });
      expect(revokeSpy).toHaveBeenCalledWith('user123');
    });
  });

  describe('forgotPassword', () => {
    const dto = { email: 'test@example.com' };
    it('should return early if user not found (no email sent)', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      await service.forgotPassword(dto);
      expect(logger.debug).toHaveBeenCalled();
      expect(mailService.send).not.toHaveBeenCalled();
    });
    it('should throw rate limit exceeded', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);
      cacheManager.get.mockResolvedValue(3);
      await expect(service.forgotPassword(dto)).rejects.toThrow(
        BusinessException,
      );
    });
    it('should throw if email quota exceeded', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);
      cacheManager.get.mockResolvedValue(0);
      emailQuotaService.canSend.mockResolvedValue(false);
      await expect(service.forgotPassword(dto)).rejects.toThrow(
        BusinessException,
      );
    });
    it('should send email, increment quota, save OTP on success', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);
      cacheManager.get.mockResolvedValue(0);
      emailQuotaService.canSend.mockResolvedValue(true);
      mailService.send.mockResolvedValue();
      emailQuotaService.increment.mockResolvedValue();
      otpRepository.deleteMany.mockResolvedValue({ count: 0 } as any);
      otpRepository.create.mockResolvedValue({} as any);
      await service.forgotPassword(dto);
      expect(mailService.send).toHaveBeenCalled();
      expect(otpRepository.deleteMany).toHaveBeenCalledWith({
        email: dto.email,
        type: 'FORGOT_PASSWORD',
      });
      expect(otpRepository.create).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const dto = {
      email: 'test@example.com',
      otp: '123456',
      newPassword: 'newPass',
    };
    const mockOtp = {
      id: 'otp1',
      otpHash: 'hashed',
      type: 'FORGOT_PASSWORD',
      expiresAt: new Date(Date.now() + 60000),
    };
    it('should throw if OTP not found or expired', async () => {
      otpRepository.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toThrow(
        BusinessException,
      );
    });
    it('should throw if OTP mismatch', async () => {
      otpRepository.findFirst.mockResolvedValue(mockOtp as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.resetPassword(dto)).rejects.toThrow(
        BusinessException,
      );
    });
    it('should throw if user not found', async () => {
      otpRepository.findFirst.mockResolvedValue(mockOtp as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersRepository.findByEmail.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toThrow(
        BusinessException,
      );
    });
    it('should update password, emit event, delete OTP, revoke sessions', async () => {
      otpRepository.findFirst.mockResolvedValue(mockOtp as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHash');
      usersRepository.update.mockResolvedValue({} as any);
      const revokeSpy = jest.spyOn(service as any, 'revokeAllUserSessions');
      cacheManager.del.mockResolvedValue(undefined);

      otpRepository.delete.mockResolvedValue(undefined as any);
      await service.resetPassword(dto);
      expect(usersRepository.update).toHaveBeenCalledWith(mockUser.id, {
        passwordHash: 'newHash',
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.password_reset', {
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(otpRepository.delete).toHaveBeenCalledWith(mockOtp.id);
      expect(revokeSpy).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('admin device management', () => {
    it('getAdminDevices should call deviceService.findAllByUser', async () => {
      deviceService.findAllByUser.mockResolvedValue([]);
      await service.getAdminDevices('user123');
      expect(deviceService.findAllByUser).toHaveBeenCalledWith('user123');
    });
    it('addAdminDevice should call deviceService.addDevice', async () => {
      const dto = { deviceId: 'abc', deviceName: 'iPhone' };
      deviceService.addDevice.mockResolvedValue({} as any);
      await service.addAdminDevice('user123', dto);
      expect(deviceService.addDevice).toHaveBeenCalledWith('user123', dto);
    });
    it('removeAdminDevice should delete cache key and call deviceService.removeDevice', async () => {
      cacheManager.del.mockResolvedValue(undefined);
      deviceService.removeDevice.mockResolvedValue();
      await service.removeAdminDevice('user123', 'deviceX');
      expect(cacheManager.del).toHaveBeenCalledWith(
        'auth:refresh:user123:deviceX',
      );
      expect(deviceService.removeDevice).toHaveBeenCalledWith(
        'user123',
        'deviceX',
      );
    });
  });

  describe('sendVerificationOtp', () => {
    const email = 'test@example.com';
    it('should throw if email quota exceeded', async () => {
      emailQuotaService.canSend.mockResolvedValue(false);
      await expect(service.sendVerificationOtp(email)).rejects.toThrow(
        BusinessException,
      );
    });
    it('should throw if mail service fails', async () => {
      emailQuotaService.canSend.mockResolvedValue(true);
      mailService.send.mockRejectedValue(new Error('Mail error'));
      await expect(service.sendVerificationOtp(email)).rejects.toThrow(
        BusinessException,
      );
    });
    it('should succeed: send mail, increment quota, save OTP', async () => {
      emailQuotaService.canSend.mockResolvedValue(true);
      mailService.send.mockResolvedValue();
      emailQuotaService.increment.mockResolvedValue();
      otpRepository.deleteMany.mockResolvedValue({ count: 0 } as any);
      otpRepository.create.mockResolvedValue({} as any);
      await service.sendVerificationOtp(email);
      expect(mailService.send).toHaveBeenCalled();
      expect(otpRepository.deleteMany).toHaveBeenCalledWith({
        email,
        type: 'VERIFY_EMAIL',
      });
      expect(otpRepository.create).toHaveBeenCalled();
    });
  });

  describe('sendDeviceOtp', () => {
    it('should silently ignore if user not admin or not found', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      await service.sendDeviceOtp('unknown@test.com', 'dev1');
      expect(mailService.send).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should throw rate limit exceeded after 3 requests', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockAdminUser as any);
      cacheManager.get.mockResolvedValue(3);
      await expect(
        service.sendDeviceOtp('admin@test.com', 'dev1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should send OTP and store pending data', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockAdminUser as any);
      cacheManager.get.mockResolvedValue(0);
      emailQuotaService.canSend.mockResolvedValue(true);
      mailService.send.mockResolvedValue(undefined);
      await service.sendDeviceOtp('admin@test.com', 'dev1', 'iPhone');
      expect(mailService.send).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('pending_admin:admin@test.com:dev1'),
        expect.objectContaining({ deviceName: 'iPhone', attempts: 0 }),
        expect.any(Number),
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/device_otp:rate:/),
        1,
        3600,
      );
    });
  });

  describe('verifyDeviceOtp', () => {
    const futureDate = new Date(Date.now() + 600000).toISOString();

    it('should throw if pending key not found', async () => {
      cacheManager.get.mockResolvedValue(null);
      await expect(
        service.verifyDeviceOtp('admin@test.com', 'dev1', '123456'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw if OTP expired', async () => {
      const expired = new Date(Date.now() - 1000).toISOString();
      cacheManager.get.mockResolvedValue({
        otpHash: 'hash',
        expiresAt: expired,
      });
      await expect(
        service.verifyDeviceOtp('admin@test.com', 'dev1', '123456'),
      ).rejects.toThrow(BusinessException);
      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('should increment attempts and throw on wrong OTP', async () => {
      const pending = {
        otpHash: await bcrypt.hash('123456', 10),
        expiresAt: futureDate,
        attempts: 0,
      };
      cacheManager.get.mockResolvedValue(pending);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.verifyDeviceOtp('admin@test.com', 'dev1', '111111'),
      ).rejects.toThrow(BusinessException);
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ attempts: 1 }),
        expect.any(Number),
      );
    });

    it('should block after 5 failed attempts', async () => {
      const pending = {
        otpHash: 'hash',
        expiresAt: futureDate,
        attempts: 4,
      };
      cacheManager.get.mockResolvedValue(pending);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.verifyDeviceOtp('admin@test.com', 'dev1', '111111'),
      ).rejects.toThrow(BusinessException);
      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('should succeed, add device, and return tokens', async () => {
      const pending = {
        otpHash: await bcrypt.hash('123456', 10),
        expiresAt: futureDate,
        deviceName: 'Laptop',
      };
      cacheManager.get.mockResolvedValue(pending);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      usersRepository.findByEmail.mockResolvedValue(mockAdminUser as any);
      deviceService.addDevice.mockResolvedValue({} as any);
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      jest.spyOn(service as any, 'generateTokens').mockResolvedValue(tokens);

      const result = await service.verifyDeviceOtp(
        'admin@test.com',
        'dev1',
        '123456',
      );
      expect(deviceService.addDevice).toHaveBeenCalledWith(mockAdminUser.id, {
        deviceId: 'dev1',
        deviceName: 'Laptop',
      });
      expect(result.accessToken).toBe('at');
      expect(cacheManager.del).toHaveBeenCalled();
    });
  });

  describe('sendWelcomeEmail', () => {
    const email = 'test@example.com';
    it('should return early if quota exceeded', async () => {
      emailQuotaService.canSend.mockResolvedValue(false);
      await service.sendWelcomeEmail(email);
      expect(mailService.send).not.toHaveBeenCalled();
    });
    it('should send email and increment quota on success', async () => {
      emailQuotaService.canSend.mockResolvedValue(true);
      mailService.send.mockResolvedValue();
      emailQuotaService.increment.mockResolvedValue();
      await service.sendWelcomeEmail(email, 'John');
      expect(mailService.send).toHaveBeenCalledWith(
        email,
        expect.any(String),
        expect.stringContaining('John'),
        expect.any(String),
      );
      expect(emailQuotaService.increment).toHaveBeenCalled();
    });
    it('should log error if mail fails but not throw', async () => {
      emailQuotaService.canSend.mockResolvedValue(true);
      mailService.send.mockRejectedValue(new Error('Mail down'));
      await expect(service.sendWelcomeEmail(email)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
