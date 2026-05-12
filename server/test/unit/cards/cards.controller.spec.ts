import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CardsDeckController } from '@modules/cards/cards-deck.controller';
import { CardsGlobalController } from '@modules/cards/cards-global.controller';
import { CardsService } from '@modules/cards/cards.service';
import { CreateCardAutoUseCase } from '@modules/cards/use-cases/create-card-auto.use-case';
import { CreateCardDto } from '@modules/cards/dto/create-card.dto';
import { UpdateCardDto } from '@modules/cards/dto/update-card.dto';
import { CreateCardAutoDto } from '@modules/cards/dto/create-card-auto.dto';
import { CardListQueryDto } from '@modules/cards/dto/card-list-query.dto';
import { CardResponseDto } from '@modules/cards/dto/card-response.dto';
import { SuccessResponseDto, PaginationResponseDto } from '@common/dto';
import { IdempotencyInterceptor } from '@common/interceptors/idempotency.interceptor';
import { LoggerService } from '@common/logger/logger.service';

describe('CardsDeckController', () => {
  let controller: CardsDeckController;
  let cardsService: jest.Mocked<CardsService>;
  let createCardAutoUseCase: jest.Mocked<CreateCardAutoUseCase>;

  const mockUser = { id: 'user1', role: 'USER' };
  const mockCard: CardResponseDto = {
    id: 'card1',
    front: 'apple',
    back: 'quả táo',
    imageUrl: null,
    audioUrl: null,
    extras: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardsDeckController],
      providers: [
        {
          provide: CardsService,
          useValue: {
            createCardManual: jest.fn(),
            findCardsByDeck: jest.fn(),
            findGlobalCardById: jest.fn(),
            deleteCardFromDeck: jest.fn(),
            updateGlobalCard: jest.fn(),
          },
        },
        {
          provide: CreateCardAutoUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: 'ICacheManager',
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        IdempotencyInterceptor,
      ],
    }).compile();

    controller = module.get(CardsDeckController);
    cardsService = module.get(CardsService);
    createCardAutoUseCase = module.get(CreateCardAutoUseCase);
  });

  describe('createManual', () => {
    it('should call cardsService.createCardManual and return success response', async () => {
      const dto: CreateCardDto = { front: 'apple', back: 'quả táo' };
      cardsService.createCardManual.mockResolvedValue(mockCard);

      const result = await controller.createManual(
        mockUser as any,
        'deck1',
        dto,
      );

      expect(cardsService.createCardManual).toHaveBeenCalledWith(
        'user1',
        'deck1',
        dto,
      );
      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data).toEqual(mockCard);
      expect(result.message).toBe('Card created');
    });
  });

  describe('createAuto', () => {
    it('should call createCardAutoUseCase.execute and return success response', async () => {
      const dto: CreateCardAutoDto = { front: 'apple' };
      createCardAutoUseCase.execute.mockResolvedValue(mockCard);

      const result = await controller.createAuto(mockUser as any, 'deck1', dto);

      expect(createCardAutoUseCase.execute).toHaveBeenCalledWith(
        'user1',
        'deck1',
        'apple',
        undefined,
      );
      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data).toEqual(mockCard);
      expect(result.message).toBe('Card auto-created');
    });
  });

  describe('findAll', () => {
    it('should call cardsService.findCardsByDeck and return pagination', async () => {
      const query: CardListQueryDto = { page: 1, limit: 20 };
      cardsService.findCardsByDeck.mockResolvedValue({
        data: [mockCard],
        total: 1,
      });

      const result = await controller.findAll(mockUser as any, 'deck1', query);

      expect(cardsService.findCardsByDeck).toHaveBeenCalledWith(
        'user1',
        'deck1',
        query,
      );
      expect(result).toBeInstanceOf(PaginationResponseDto);
      expect(result.data).toEqual([mockCard]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should call cardsService.findGlobalCardById and return success response', async () => {
      cardsService.findGlobalCardById.mockResolvedValue(mockCard);

      const result = await controller.findOne('card1');

      expect(cardsService.findGlobalCardById).toHaveBeenCalledWith('card1');
      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data).toEqual(mockCard);
    });
  });

  describe('update', () => {
    it('should call cardsService.updateGlobalCard and return success response', async () => {
      const dto: UpdateCardDto = { front: 'updated' };
      cardsService.updateGlobalCard.mockResolvedValue({
        ...mockCard,
        front: 'updated',
      } as any);

      const result = await controller.update(mockUser as any, 'card1', dto);

      expect(cardsService.updateGlobalCard).toHaveBeenCalledWith(
        'user1',
        'card1',
        dto,
      );
      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data.front).toBe('updated');
      expect(result.message).toBe('Card updated');
    });
  });

  describe('delete', () => {
    it('should call cardsService.deleteCardFromDeck and return success response', async () => {
      cardsService.deleteCardFromDeck.mockResolvedValue();

      const result = await controller.delete(mockUser as any, 'deck1', 'card1');

      expect(cardsService.deleteCardFromDeck).toHaveBeenCalledWith(
        'user1',
        'deck1',
        'card1',
      );
      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Card removed from deck');
    });
  });
});

describe('CardsGlobalController', () => {
  let controller: CardsGlobalController;
  let cardsService: jest.Mocked<CardsService>;

  const mockUser = { id: 'user1', role: 'USER' };
  const mockCard: CardResponseDto = {
    id: 'card1',
    front: 'apple',
    back: 'quả táo',
    imageUrl: null,
    audioUrl: null,
    extras: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardsGlobalController],
      providers: [
        {
          provide: CardsService,
          useValue: {
            findGlobalCardById: jest.fn(),
            updateGlobalCard: jest.fn(),
            uploadImage: jest.fn(),
            deleteImage: jest.fn(),
            uploadAudio: jest.fn(),
            deleteAudio: jest.fn(),
            generateAiHint: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(CardsGlobalController);
    cardsService = module.get(CardsService);
  });

  describe('findGlobalCard (standalone)', () => {
    it('should call cardsService.findGlobalCardById', async () => {
      cardsService.findGlobalCardById.mockResolvedValue(mockCard);

      const result = await controller.findGlobalCard('card1');

      expect(cardsService.findGlobalCardById).toHaveBeenCalledWith('card1');
      expect(result.data).toEqual(mockCard);
    });
  });

  describe('updateGlobalCard (standalone)', () => {
    it('should call cardsService.updateGlobalCard', async () => {
      const dto: UpdateCardDto = { back: 'new back' };
      cardsService.updateGlobalCard.mockResolvedValue(mockCard);

      const result = await controller.updateGlobalCard(
        mockUser as any,
        'card1',
        dto,
      );

      expect(cardsService.updateGlobalCard).toHaveBeenCalledWith(
        'user1',
        'card1',
        dto,
      );
      expect(result.message).toBe('Card updated');
    });
  });

  describe('uploadImage', () => {
    it('should call cardsService.uploadImage', async () => {
      const mockFile = {
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      cardsService.uploadImage.mockResolvedValue(mockCard);

      const result = await controller.uploadImage(
        mockUser as any,
        'card1',
        mockFile,
      );

      expect(cardsService.uploadImage).toHaveBeenCalledWith(
        'user1',
        'card1',
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
      );
      expect(result.message).toBe('Image uploaded');
    });
  });

  describe('deleteImage', () => {
    it('should call cardsService.deleteImage', async () => {
      cardsService.deleteImage.mockResolvedValue(mockCard);

      const result = await controller.deleteImage(mockUser as any, 'card1');

      expect(cardsService.deleteImage).toHaveBeenCalledWith('user1', 'card1');
      expect(result.message).toBe('Image deleted');
    });
  });

  describe('uploadAudio', () => {
    it('should call cardsService.uploadAudio', async () => {
      const mockFile = {
        buffer: Buffer.from(''),
        originalname: 'test.mp3',
        mimetype: 'audio/mpeg',
      } as Express.Multer.File;
      cardsService.uploadAudio.mockResolvedValue(mockCard);

      const result = await controller.uploadAudio(
        mockUser as any,
        'card1',
        mockFile,
      );

      expect(cardsService.uploadAudio).toHaveBeenCalledWith(
        'user1',
        'card1',
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
      );
      expect(result.message).toBe('Audio uploaded');
    });
  });

  describe('deleteAudio', () => {
    it('should call cardsService.deleteAudio', async () => {
      cardsService.deleteAudio.mockResolvedValue(mockCard);

      const result = await controller.deleteAudio(mockUser as any, 'card1');

      expect(cardsService.deleteAudio).toHaveBeenCalledWith('user1', 'card1');
      expect(result.message).toBe('Audio deleted');
    });
  });

  describe('generateAiHint', () => {
    it('should call cardsService.generateAiHint', async () => {
      cardsService.generateAiHint.mockResolvedValue({ hint: 'test hint' });

      const result = await controller.generateAiHint('card1');

      expect(cardsService.generateAiHint).toHaveBeenCalledWith('card1');
      expect(result.data.hint).toBe('test hint');
      expect(result.message).toBe('AI hint generated');
    });
  });
});
