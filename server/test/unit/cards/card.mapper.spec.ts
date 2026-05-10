import { CardMapper } from '@modules/cards/mappers/card.mapper';
import { GlobalCard } from '@prisma/client';

describe('CardMapper', () => {
  let mapper: CardMapper;

  const mockCard: GlobalCard = {
    id: 'card1',
    front: 'apple',
    back: 'quả táo',
    imageUrl: 'https://example.com/image.jpg',
    audioUrl: 'https://example.com/audio.mp3',
    extras: { example: 'This is an apple' },
    status: 'completed',
    errorMessage: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    deletedAt: null,
  };

  beforeEach(() => {
    mapper = new CardMapper();
  });

  describe('toResponseDto', () => {
    it('should map GlobalCard to CardResponseDto with only exposed fields', () => {
      const result = mapper.toResponseDto(mockCard);

      expect(result).toBeDefined();
      expect(result.id).toBe('card1');
      expect(result.front).toBe('apple');
      expect(result.back).toBe('quả táo');
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
      expect(result.audioUrl).toBe('https://example.com/audio.mp3');
      expect(result.extras).toEqual({ example: 'This is an apple' });
      expect(result.status).toBe('completed');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should exclude internal fields like deletedAt', () => {
      const result = mapper.toResponseDto(mockCard);

      expect((result as any).deletedAt).toBeUndefined();
    });

    it('should handle null optional fields', () => {
      const cardWithNulls: GlobalCard = {
        ...mockCard,
        imageUrl: null,
        audioUrl: null,
        extras: {},
      };

      const result = mapper.toResponseDto(cardWithNulls);

      expect(result.imageUrl).toBeNull();
      expect(result.audioUrl).toBeNull();
      expect(result.extras).toEqual({});
    });
  });

  describe('toResponseDtoList', () => {
    it('should map array of GlobalCards to array of CardResponseDto', () => {
      const cards: GlobalCard[] = [
        mockCard,
        { ...mockCard, id: 'card2', front: 'banana', back: 'quả chuối' },
      ];

      const result = mapper.toResponseDtoList(cards);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('card1');
      expect(result[1].id).toBe('card2');
      expect(result[1].front).toBe('banana');
    });

    it('should return empty array for empty input', () => {
      const result = mapper.toResponseDtoList([]);
      expect(result).toEqual([]);
    });
  });
});
