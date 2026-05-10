import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { UsersService } from '@modules/users/users.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
    isActive: true,
    isBanned: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth.jwtSecret') return 'test-secret';
              return null;
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByIdForAuth: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
    usersService = module.get(UsersService);
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not defined', async () => {
      await expect(
        Test.createTestingModule({
          providers: [
            JwtStrategy,
            {
              provide: ConfigService,
              useValue: { get: jest.fn().mockReturnValue(undefined) },
            },
            {
              provide: UsersService,
              useValue: {},
            },
          ],
        }).compile(),
      ).rejects.toThrow('JWT_SECRET is not defined');
    });
  });

  describe('validate', () => {
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      role: 'USER',
      deviceId: 'device-1',
    };

    it('should return RequestUser when user is valid', async () => {
      usersService.findByIdForAuth.mockResolvedValue(mockUser as any);

      const result = await strategy.validate(payload);
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });
      expect(usersService.findByIdForAuth).toHaveBeenCalledWith('user-123');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByIdForAuth.mockResolvedValue(null);
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      usersService.findByIdForAuth.mockResolvedValue({
        ...mockUser,
        isBanned: true,
      } as any);
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      usersService.findByIdForAuth.mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
