import { Test, TestingModule } from '@nestjs/testing';
import { DeckMapper } from '@modules/decks/mappers/deck.mapper';
import { Deck } from '@prisma/client';
import { DeckResponseDto } from '@modules/decks/dto/deck-response.dto';

describe('DeckMapper', () => {
  let mapper: DeckMapper;

  const mockDeck: Deck = {
    id: 'deck1',
    userId: 'user1',
    title: 'Test Deck',
    description: 'A test deck',
    coverUrl: 'https://example.com/cover.jpg',
    visibility: 'PUBLIC',
    tags: ['toeic', 'grammar'],
    isVipOnly: false,
    totalCards: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeckMapper],
    }).compile();

    mapper = module.get(DeckMapper);
  });

  describe('toResponseDto', () => {
    it('should map Deck to DeckResponseDto with exposed fields only', () => {
      const dto = mapper.toResponseDto(mockDeck);

      expect(dto).toBeInstanceOf(DeckResponseDto);
      expect(dto.id).toBe('deck1');
      expect(dto.title).toBe('Test Deck');
      expect(dto.description).toBe('A test deck');
      expect(dto.coverUrl).toBe('https://example.com/cover.jpg');
      expect(dto.visibility).toBe('PUBLIC');
      expect(dto.tags).toEqual(['toeic', 'grammar']);
      expect(dto.isVipOnly).toBe(false);
      expect(dto.totalCards).toBe(10);
      expect(dto.createdAt).toEqual(new Date('2024-01-01'));
      expect(dto.updatedAt).toEqual(new Date('2024-01-02'));
    });

    it('should exclude internal fields like userId, deletedAt', () => {
      const dto = mapper.toResponseDto(mockDeck);

      expect((dto as any).userId).toBeUndefined();
      expect((dto as any).deletedAt).toBeUndefined();
    });

    it('should handle null optional fields', () => {
      const deckWithNulls: Deck = {
        ...mockDeck,
        description: null,
        coverUrl: null,
      };

      const dto = mapper.toResponseDto(deckWithNulls);
      expect(dto.description).toBeNull();
      expect(dto.coverUrl).toBeNull();
    });
  });

  describe('toResponseDtoList', () => {
    it('should map array of Decks to array of DeckResponseDto', () => {
      const decks = [mockDeck, { ...mockDeck, id: 'deck2', title: 'Deck 2' }];
      const dtos = mapper.toResponseDtoList(decks);

      expect(dtos).toHaveLength(2);
      expect(dtos[0]).toBeInstanceOf(DeckResponseDto);
      expect(dtos[1].id).toBe('deck2');
      expect(dtos[1].title).toBe('Deck 2');
    });

    it('should return empty array for empty input', () => {
      const result = mapper.toResponseDtoList([]);
      expect(result).toEqual([]);
    });
  });
});
