// test/unit/pusher-auth/pusher-auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PusherAuthService } from '@modules/pusher-auth/pusher-auth.service';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';

describe('PusherAuthService', () => {
  let service: PusherAuthService;
  let pusherService: jest.Mocked<PusherService>;
  let prisma: jest.Mocked<PrismaService>;
  let logger: jest.Mocked<LoggerService>;

  const mockPusherService = {
    authenticate: jest.fn(),
  };

  const mockPrisma = {
    deck: {
      findUnique: jest.fn(),
    },
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockUser: any = {
    id: 'user-1',
    email: 'test@test.com',
    role: 'USER',
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockAdmin: any = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PusherAuthService,
        { provide: PusherService, useValue: mockPusherService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(PusherAuthService);
    pusherService = module.get(PusherService);
    prisma = module.get(PrismaService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    const dto = { socket_id: 'socket-1', channel_name: 'private-user-user-1' };

    it('should allow user to subscribe to their own private channel', async () => {
      mockPusherService.authenticate.mockReturnValue({
        auth: 'auth-token',
        channel_data: undefined,
      });

      const result = await service.authenticate(mockUser, dto);

      expect(pusherService.authenticate).toHaveBeenCalledWith(
        'socket-1',
        'private-user-user-1',
        { user_id: 'user-1', user_info: { role: 'USER' } },
      );
      expect(result.auth).toBe('auth-token');
    });

    it('should reject if user tries to access another users private channel', async () => {
      const otherChannel = {
        socket_id: 'socket-1',
        channel_name: 'private-user-other-user',
      };

      await expect(
        service.authenticate(mockUser, otherChannel),
      ).rejects.toThrow(BusinessException);
    });

    it('should allow access to collab channel if user owns the deck', async () => {
      const collabDto = {
        socket_id: 'socket-1',
        channel_name: 'private-collab-deck-1',
      };
      mockPrisma.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        userId: 'user-1',
      });
      mockPusherService.authenticate.mockReturnValue({
        auth: 'auth-token',
        channel_data: undefined,
      });

      const result = await service.authenticate(mockUser, collabDto);

      expect(result.auth).toBe('auth-token');
    });

    it('should reject collab channel if user does not own the deck', async () => {
      const collabDto = {
        socket_id: 'socket-1',
        channel_name: 'private-collab-deck-1',
      };
      mockPrisma.deck.findUnique.mockResolvedValue({
        id: 'deck-1',
        userId: 'other-user',
      });

      await expect(service.authenticate(mockUser, collabDto)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should allow ADMIN on presence channels', async () => {
      const presenceDto = {
        socket_id: 'socket-1',
        channel_name: 'presence-global',
      };
      mockPusherService.authenticate.mockReturnValue({
        auth: 'auth-admin',
        channel_data: JSON.stringify({ user_id: 'admin-1' }),
      });

      const result = await service.authenticate(mockAdmin, presenceDto);

      expect(result.auth).toBe('auth-admin');
    });

    it('should reject non-admin on presence channels', async () => {
      const presenceDto = {
        socket_id: 'socket-1',
        channel_name: 'presence-global',
      };

      await expect(service.authenticate(mockUser, presenceDto)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should reject unsupported channel types', async () => {
      const badDto = {
        socket_id: 'socket-1',
        channel_name: 'public-global',
      };

      await expect(service.authenticate(mockUser, badDto)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should handle Pusher authentication failure', async () => {
      mockPusherService.authenticate.mockImplementation(() => {
        throw new Error('Pusher error');
      });

      await expect(service.authenticate(mockUser, dto)).rejects.toThrow(
        BusinessException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
