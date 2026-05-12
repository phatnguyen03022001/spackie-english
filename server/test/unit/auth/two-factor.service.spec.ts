// test/unit/auth/two-factor.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorService } from '@modules/auth/two-factor.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';

// Mock speakeasy
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn().mockReturnValue({
    base32: 'JBSWY3DPEHPK3PXP',
    otpauth_url:
      'otpauth://totp/Spackie%20English:test@test.com?secret=JBSWY3DPEHPK3PXP',
  }),
  totp: {
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,test'),
}));

import * as speakeasy from 'speakeasy';

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prisma: jest.Mocked<PrismaService>;
  let cacheManager: any;
  let logger: jest.Mocked<LoggerService>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'ICacheManager', useValue: mockCacheManager },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(TwoFactorService);
    prisma = module.get(PrismaService);
    cacheManager = module.get('ICacheManager');
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enable', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.enable('user-1')).rejects.toThrow(BusinessException);
    });

    it('should throw if 2FA already enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: true,
      });

      await expect(service.enable('user-1')).rejects.toThrow(BusinessException);
    });

    it('should generate secret, QR code, and recovery codes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        twoFactorEnabled: false,
      });
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.enable('user-1');

      expect(result.secret).toBeDefined();
      expect(result.otpauthUrl).toBeDefined();
      expect(result.recoveryCodes).toHaveLength(10);
      expect(mockCacheManager.set).toHaveBeenCalledTimes(2); // pending secret + recovery codes
    });
  });

  describe('verifyAndEnable', () => {
    it('should throw if no pending setup', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await expect(service.verifyAndEnable('user-1', '123456')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw if OTP invalid', async () => {
      mockCacheManager.get.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://...',
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifyAndEnable('user-1', '000000')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should enable 2FA on valid OTP', async () => {
      mockCacheManager.get
        .mockResolvedValueOnce({
          secret: 'JBSWY3DPEHPK3PXP',
          otpauthUrl: 'otpauth://...',
        })
        .mockResolvedValueOnce(['hash1', 'hash2']);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      await service.verifyAndEnable('user-1', '123456');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            twoFactorEnabled: true,
          }),
        }),
      );
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('disable', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.disable('user-1', '123456')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw if 2FA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });

      await expect(service.disable('user-1', '123456')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should disable 2FA on valid OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      await service.disable('user-1', '123456');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            twoFactorEnabled: false,
            twoFactorSecret: null,
          }),
        }),
      );
    });
  });

  describe('verifyOtp', () => {
    it('should return false if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.verifyOtp('user-1', '123456');

      expect(result).toBe(false);
    });

    it('should return true on valid OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        recoveryCodes: [],
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyOtp('user-1', '123456');

      expect(result).toBe(true);
    });
  });

  describe('getRecoveryCodes', () => {
    it('should throw if 2FA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: false,
      });

      await expect(service.getRecoveryCodes('user-1')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should generate and save new recovery codes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: true,
      });

      const result = await service.getRecoveryCodes('user-1');

      expect(result).toHaveLength(10);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });
});
