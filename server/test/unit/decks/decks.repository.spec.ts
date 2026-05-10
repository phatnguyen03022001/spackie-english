import { Test, TestingModule } from '@nestjs/testing';
import { DecksRepository } from '@modules/decks/decks.repository';
import { PrismaService } from '@database/prisma.service';
import { DeckListQueryDto } from '@modules/decks/dto/deck-list-query.dto';

describe('DecksRepository', () => {
  let repository: DecksRepository;
  let prisma: {
    deck: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    deckCardMapping: {
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecksRepository,
        {
          provide: PrismaService,
          useValue: {
            deck: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
            deckCardMapping: {
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get(DecksRepository);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should call prisma.deck.create with data and deletedAt: null', async () => {
      const input = {
        title: 'Test deck',
        user: { connect: { id: 'user1' } },
      };
      const expected = { id: 'deck1', ...input, deletedAt: null };
      prisma.deck.create.mockResolvedValue(expected);

      const result = await repository.create(input as any);
      expect(prisma.deck.create).toHaveBeenCalledWith({
        data: { ...input, deletedAt: null },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findById', () => {
    it('should find by id using findUnique', async () => {
      prisma.deck.findUnique.mockResolvedValue({ id: 'deck1' });
      const result = await repository.findById('deck1');
      expect(prisma.deck.findUnique).toHaveBeenCalledWith({
        where: { id: 'deck1' },
      });
      expect(result).toEqual({ id: 'deck1' });
    });

    it('should return null when not found', async () => {
      prisma.deck.findUnique.mockResolvedValue(null);
      const result = await repository.findById('missing');
      expect(result).toBeNull();
    });

    it('should return null when deck is soft deleted', async () => {
      prisma.deck.findUnique.mockResolvedValue({
        id: 'deck1',
        deletedAt: new Date(),
      });
      const result = await repository.findById('deck1');
      expect(result).toBeNull();
    });
  });

  describe('findOwnDecks', () => {
    const baseQuery: DeckListQueryDto = {
      page: 1,
      limit: 10,
      sort: 'createdAt:desc',
    };

    it('should filter by userId and deletedAt: null', async () => {
      prisma.deck.findMany.mockResolvedValue([]);
      prisma.deck.count.mockResolvedValue(0);

      await repository.findOwnDecks('user1', baseQuery);
      expect(prisma.deck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user1', deletedAt: null },
        }),
      );
    });

    it('should apply search filter on title', async () => {
      const query: DeckListQueryDto = { ...baseQuery, search: 'vocab' };
      prisma.deck.findMany.mockResolvedValue([]);
      prisma.deck.count.mockResolvedValue(0);

      await repository.findOwnDecks('user1', query);
      expect(prisma.deck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'vocab', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by visibility', async () => {
      const query: DeckListQueryDto = { ...baseQuery, visibility: 'PUBLIC' };
      prisma.deck.findMany.mockResolvedValue([]);
      prisma.deck.count.mockResolvedValue(0);

      await repository.findOwnDecks('user1', query);
      expect(prisma.deck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ visibility: 'PUBLIC' }),
        }),
      );
    });

    it('should filter by tag', async () => {
      const query: DeckListQueryDto = { ...baseQuery, tag: 'toeic' };
      prisma.deck.findMany.mockResolvedValue([]);
      prisma.deck.count.mockResolvedValue(0);

      await repository.findOwnDecks('user1', query);
      expect(prisma.deck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tags: { has: 'toeic' } }),
        }),
      );
    });

    it('should filter by isVipOnly', async () => {
      const query: DeckListQueryDto = { ...baseQuery, isVipOnly: true };
      prisma.deck.findMany.mockResolvedValue([]);
      prisma.deck.count.mockResolvedValue(0);

      await repository.findOwnDecks('user1', query);
      expect(prisma.deck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isVipOnly: true }),
        }),
      );
    });

    it('should apply pagination', async () => {
      const query: DeckListQueryDto = {
        page: 3,
        limit: 25,
        sort: 'createdAt:desc',
      };
      prisma.deck.findMany.mockResolvedValue([]);
      prisma.deck.count.mockResolvedValue(0);

      await repository.findOwnDecks('user1', query);
      expect(prisma.deck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 25 }),
      );
    });

    it('should return both decks and total count', async () => {
      const mockDecks = [{ id: 'deck1' }, { id: 'deck2' }];
      prisma.deck.findMany.mockResolvedValue(mockDecks);
      prisma.deck.count.mockResolvedValue(5);

      const result = await repository.findOwnDecks('user1', baseQuery);
      expect(result.decks).toEqual(mockDecks);
      expect(result.total).toBe(5);
    });
  });

  describe('findPublicDecks', () => {
    const baseQuery: DeckListQueryDto = {
      page: 1,
      limit: 10,
      sort: 'createdAt:desc',
    };

    it('should filter by PUBLIC visibility and deletedAt: null', async () => {
      prisma.deck.findMany.mockResolvedValue([]);
      prisma.deck.count.mockResolvedValue(0);

      await repository.findPublicDecks(baseQuery);
      expect(prisma.deck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { visibility: 'PUBLIC', deletedAt: null },
        }),
      );
    });

    it('should apply search filter', async () => {
      const query: DeckListQueryDto = { ...baseQuery, search: 'english' };
      prisma.deck.findMany.mockResolvedValue([]);
      prisma.deck.count.mockResolvedValue(0);

      await repository.findPublicDecks(query);
      expect(prisma.deck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'english', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should return both decks and total count', async () => {
      const mockDecks = [{ id: 'deck1' }];
      prisma.deck.findMany.mockResolvedValue(mockDecks);
      prisma.deck.count.mockResolvedValue(3);

      const result = await repository.findPublicDecks(baseQuery);
      expect(result.decks).toEqual(mockDecks);
      expect(result.total).toBe(3);
    });
  });

  describe('update', () => {
    it('should call prisma.deck.update with id and data', async () => {
      const data = { title: 'Updated' };
      const expected = { id: 'deck1', ...data };
      prisma.deck.update.mockResolvedValue(expected);

      const result = await repository.update('deck1', data);
      expect(prisma.deck.update).toHaveBeenCalledWith({
        where: { id: 'deck1' },
        data,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt', async () => {
      const now = new Date();
      jest.useFakeTimers().setSystemTime(now);
      prisma.deck.update.mockResolvedValue({
        id: 'deck1',
        deletedAt: now,
      });

      const result = await repository.softDelete('deck1');
      expect(prisma.deck.update).toHaveBeenCalledWith({
        where: { id: 'deck1' },
        data: { deletedAt: now },
      });
      expect(result.deletedAt).toEqual(now);
      jest.useRealTimers();
    });
  });

  describe('incrementTotalCards', () => {
    it('should increment totalCards by delta', async () => {
      prisma.deck.update.mockResolvedValue({} as any);

      await repository.incrementTotalCards('deck1', 1);
      expect(prisma.deck.update).toHaveBeenCalledWith({
        where: { id: 'deck1' },
        data: { totalCards: { increment: 1 } },
      });
    });

    it('should decrement totalCards with negative delta', async () => {
      prisma.deck.update.mockResolvedValue({} as any);

      await repository.incrementTotalCards('deck1', -1);
      expect(prisma.deck.update).toHaveBeenCalledWith({
        where: { id: 'deck1' },
        data: { totalCards: { increment: -1 } },
      });
    });
  });
});
