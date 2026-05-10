import { Test, TestingModule } from '@nestjs/testing';
import { CardsRepository } from '@modules/cards/cards.repository';
import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@common/logger/logger.service';

describe('CardsRepository', () => {
  let repository: CardsRepository;
  let prisma: {
    globalCard: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    deckCardMapping: {
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
    };
  };

  const mockGlobalCard = {
    id: 'card1',
    front: 'apple',
    back: 'quả táo',
    imageUrl: null,
    audioUrl: null,
    extras: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockMapping = {
    id: 'mapping1',
    deckId: 'deck1',
    globalCardId: 'card1',
    sortOrder: 0,
    addedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsRepository,
        {
          provide: PrismaService,
          useValue: {
            globalCard: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            deckCardMapping: {
              create: jest.fn(),
              delete: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
            },
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

    repository = module.get(CardsRepository);
    prisma = module.get(PrismaService);
  });

  describe('findGlobalCardByFront', () => {
    it('should find by front text', async () => {
      prisma.globalCard.findUnique.mockResolvedValue(mockGlobalCard);
      const result = await repository.findGlobalCardByFront('apple');
      expect(prisma.globalCard.findUnique).toHaveBeenCalledWith({
        where: { front: 'apple' },
      });
      expect(result?.front).toBe('apple');
    });

    it('should return null if not found', async () => {
      prisma.globalCard.findUnique.mockResolvedValue(null);
      const result = await repository.findGlobalCardByFront('unknown');
      expect(result).toBeNull();
    });
  });

  describe('createGlobalCard', () => {
    it('should create a new global card', async () => {
      prisma.globalCard.create.mockResolvedValue(mockGlobalCard);
      const result = await repository.createGlobalCard({
        front: 'apple',
        back: 'quả táo',
        extras: {},
      });
      expect(prisma.globalCard.create).toHaveBeenCalledWith({
        data: { front: 'apple', back: 'quả táo', extras: {} },
      });
      expect(result.front).toBe('apple');
    });
  });

  describe('findGlobalCardById', () => {
    it('should find by id', async () => {
      prisma.globalCard.findUnique.mockResolvedValue(mockGlobalCard);
      const result = await repository.findGlobalCardById('card1');
      expect(prisma.globalCard.findUnique).toHaveBeenCalledWith({
        where: { id: 'card1' },
      });
      expect(result?.id).toBe('card1');
    });
  });

  describe('createMapping', () => {
    it('should create a deck-card mapping', async () => {
      prisma.deckCardMapping.create.mockResolvedValue(mockMapping);
      const result = await repository.createMapping({
        deck: { connect: { id: 'deck1' } },
        globalCard: { connect: { id: 'card1' } },
      });
      expect(prisma.deckCardMapping.create).toHaveBeenCalled();
      expect(result.deckId).toBe('deck1');
    });
  });

  describe('deleteMapping', () => {
    it('should delete mapping by composite key', async () => {
      prisma.deckCardMapping.delete.mockResolvedValue({});
      await repository.deleteMapping('deck1', 'card1');
      expect(prisma.deckCardMapping.delete).toHaveBeenCalledWith({
        where: {
          deckId_globalCardId: { deckId: 'deck1', globalCardId: 'card1' },
        },
      });
    });
  });

  describe('findMappingsByDeck', () => {
    it('should return paginated mappings with globalCard', async () => {
      const mappings = [{ ...mockMapping, globalCard: mockGlobalCard }];
      prisma.deckCardMapping.findMany.mockResolvedValue(mappings);
      prisma.deckCardMapping.count.mockResolvedValue(1);

      const result = await repository.findMappingsByDeck('deck1', 1, 20);

      expect(prisma.deckCardMapping.findMany).toHaveBeenCalledWith({
        where: { deckId: 'deck1' },
        skip: 0,
        take: 20,
        include: { globalCard: true },
        orderBy: { sortOrder: 'asc' },
      });
      expect(result.mappings).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should search by front/back text', async () => {
      prisma.deckCardMapping.findMany.mockResolvedValue([]);
      prisma.deckCardMapping.count.mockResolvedValue(0);

      await repository.findMappingsByDeck('deck1', 1, 20, 'apple');

      expect(prisma.deckCardMapping.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deckId: 'deck1',
            globalCard: {
              OR: [
                { front: { contains: 'apple', mode: 'insensitive' } },
                { back: { contains: 'apple', mode: 'insensitive' } },
              ],
            },
          },
        }),
      );
    });
  });

  describe('mappingExists', () => {
    it('should return true if mapping exists', async () => {
      prisma.deckCardMapping.findUnique.mockResolvedValue(mockMapping);
      const result = await repository.mappingExists('deck1', 'card1');
      expect(result).toBe(true);
    });

    it('should return false if mapping does not exist', async () => {
      prisma.deckCardMapping.findUnique.mockResolvedValue(null);
      const result = await repository.mappingExists('deck1', 'card1');
      expect(result).toBe(false);
    });
  });

  describe('countMappingsByGlobalCard', () => {
    it('should count mappings for a global card', async () => {
      prisma.deckCardMapping.count.mockResolvedValue(3);
      const result = await repository.countMappingsByGlobalCard('card1');
      expect(result).toBe(3);
    });
  });
});
