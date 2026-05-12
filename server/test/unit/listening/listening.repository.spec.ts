import { Test, TestingModule } from '@nestjs/testing';
import { ListeningRepository } from '@modules/listening/listening.repository';
import { PrismaService } from '@database/prisma.service';

describe('ListeningRepository', () => {
  let repository: ListeningRepository;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    listeningPractice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListeningRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(ListeningRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPractice', () => {
    it('should create a listening practice record', async () => {
      const data = {
        userId: 'user1',
        globalCardId: 'card1',
        type: 'REPEAT' as const,
        score: 0,
        duration: 0,
      };
      const expected = { id: 'practice1', ...data };
      mockPrisma.listeningPractice.create.mockResolvedValue(expected);

      const result = await repository.createPractice(data);

      expect(mockPrisma.listeningPractice.create).toHaveBeenCalledWith({
        data,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findPracticeById', () => {
    it('should find a practice by id with card relation', async () => {
      const expected = {
        id: 'practice1',
        globalCard: { id: 'card1', front: 'apple', back: 'quả táo' },
      };
      mockPrisma.listeningPractice.findUnique.mockResolvedValue(expected);

      const result = await repository.findPracticeById('practice1');

      expect(mockPrisma.listeningPractice.findUnique).toHaveBeenCalledWith({
        where: { id: 'practice1' },
        include: {
          globalCard: { select: { id: true, front: true, back: true } },
        },
      });
      expect(result).toEqual(expected);
    });

    it('should return null if practice not found', async () => {
      mockPrisma.listeningPractice.findUnique.mockResolvedValue(null);

      const result = await repository.findPracticeById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updatePractice', () => {
    it('should update a practice record', async () => {
      const data = { score: 95, accuracy: 90 };
      const expected = { id: 'practice1', ...data };
      mockPrisma.listeningPractice.update.mockResolvedValue(expected);

      const result = await repository.updatePractice('practice1', data);

      expect(mockPrisma.listeningPractice.update).toHaveBeenCalledWith({
        where: { id: 'practice1' },
        data,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findHistoryByUser', () => {
    it('should return paginated history with total count', async () => {
      const items = [
        { id: 'practice1', globalCard: { id: 'card1', front: 'apple' } },
      ];
      mockPrisma.listeningPractice.findMany.mockResolvedValue(items);
      mockPrisma.listeningPractice.count.mockResolvedValue(1);

      const result = await repository.findHistoryByUser('user1', 0, 10);

      expect(mockPrisma.listeningPractice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { globalCard: { select: { id: true, front: true } } },
      });
      expect(mockPrisma.listeningPractice.count).toHaveBeenCalledWith({
        where: { userId: 'user1' },
      });
      expect(result).toEqual({ items, total: 1 });
    });
  });

  describe('getUserStats', () => {
    it('should return aggregated stats', async () => {
      const practices = [
        { score: 80, accuracy: 75, duration: 30000 },
        { score: 90, accuracy: 85, duration: 45000 },
      ];
      mockPrisma.listeningPractice.findMany.mockResolvedValue(practices);

      const result = await repository.getUserStats('user1');

      expect(result).toEqual({
        totalPractices: 2,
        averageScore: 85,
        averageAccuracy: 80,
        totalDuration: 75000,
      });
    });

    it('should return zeros when no practices exist', async () => {
      mockPrisma.listeningPractice.findMany.mockResolvedValue([]);

      const result = await repository.getUserStats('user1');

      expect(result).toEqual({
        totalPractices: 0,
        averageScore: 0,
        averageAccuracy: 0,
        totalDuration: 0,
      });
    });
  });
});
