// test/unit/users/users-gdpr.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersGdprService } from '@modules/users/users-gdpr.service';
import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';

describe('UsersGdprService', () => {
  let service: UsersGdprService;
  let prisma: jest.Mocked<PrismaService>;
  let logger: jest.Mocked<LoggerService>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    deck: {
      findMany: jest.fn(),
    },
    cardProgress: {
      findMany: jest.fn(),
    },
    listeningPractice: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
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
        UsersGdprService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(UsersGdprService);
    prisma = module.get(PrismaService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportUserData', () => {
    const userId = 'user-1';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      role: 'USER',
      provider: 'LOCAL',
      isVerified: true,
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    it('should export all user data in parallel', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.deck.findMany.mockResolvedValue([
        {
          id: 'deck-1',
          title: 'My Deck',
          totalCards: 20,
          visibility: 'PUBLIC',
          createdAt: new Date(),
          description: null,
        },
      ]);
      mockPrisma.cardProgress.findMany.mockResolvedValue([
        {
          easeFactor: 2.5,
          interval: 5,
          reviewCount: 3,
          firstSeenAt: new Date(),
          globalCard: { front: 'hello', back: 'xin chào' },
        },
      ]);
      mockPrisma.listeningPractice.findMany.mockResolvedValue([
        { type: 'LISTEN', score: 85, duration: 120, createdAt: new Date() },
      ]);
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          orderCode: 123,
          amount: 99000,
          status: 'PAID',
          plan: 'MONTHLY',
          createdAt: new Date(),
        },
      ]);

      const result = await service.exportUserData(userId);

      expect(result.user).toBeDefined();
      expect(result.decks).toHaveLength(1);
      expect(result.cards).toHaveLength(1);
      expect(result.listeningPractices).toHaveLength(1);
      expect(result.payments).toHaveLength(1);
      expect(result.exportDate).toBeDefined();
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.exportUserData(userId)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should return empty arrays when no related data exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.deck.findMany.mockResolvedValue([]);
      mockPrisma.cardProgress.findMany.mockResolvedValue([]);
      mockPrisma.listeningPractice.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.exportUserData(userId);

      expect(result.decks).toEqual([]);
      expect(result.cards).toEqual([]);
      expect(result.listeningPractices).toEqual([]);
      expect(result.payments).toEqual([]);
    });
  });
});
