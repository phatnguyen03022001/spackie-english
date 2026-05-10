import { Test, TestingModule } from '@nestjs/testing';
import { DecksController } from '@modules/decks/decks.controller';
import { DecksService } from '@modules/decks/decks.service';
import { UpdateCoverUseCase } from '@modules/decks/use-cases/update-cover.use-case';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { CreateDeckDto } from '@modules/decks/dto/create-deck.dto';
import { UpdateDeckDto } from '@modules/decks/dto/update-deck.dto';
import { DeckListQueryDto } from '@modules/decks/dto/deck-list-query.dto';

describe('DecksController', () => {
  let controller: DecksController;
  let decksService: jest.Mocked<DecksService>;
  let updateCoverUseCase: jest.Mocked<UpdateCoverUseCase>;

  const mockDeckResponse = {
    id: 'deck-123',
    title: 'Test Deck',
    visibility: 'PRIVATE',
    tags: [],
    isVipOnly: false,
    totalCards: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockCurrentUser: RequestUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DecksController],
      providers: [
        {
          provide: DecksService,
          useValue: {
            create: jest.fn(),
            findOwnDecks: jest.fn(),
            findPublicDecks: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteCover: jest.fn(),
          },
        },
        {
          provide: UpdateCoverUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DecksController);
    decksService = module.get(DecksService);
    updateCoverUseCase = module.get(UpdateCoverUseCase);
  });

  describe('create', () => {
    it('should call decksService.create and return success response', async () => {
      const dto: CreateDeckDto = { title: 'New Deck' };
      decksService.create.mockResolvedValue(mockDeckResponse);

      const result = await controller.create(mockCurrentUser, dto);

      expect(decksService.create).toHaveBeenCalledWith('user-123', dto);
      expect(result.data).toEqual(mockDeckResponse);
      expect(result.message).toBe('Deck created');
    });
  });

  describe('findMyDecks', () => {
    it('should call decksService.findOwnDecks and return pagination', async () => {
      const query: DeckListQueryDto = {
        page: 1,
        limit: 10,
        sort: 'createdAt:desc',
      };
      const mockResult = { data: [mockDeckResponse], total: 1 };
      decksService.findOwnDecks.mockResolvedValue(mockResult);

      const result = await controller.findMyDecks(mockCurrentUser, query);

      expect(decksService.findOwnDecks).toHaveBeenCalledWith('user-123', query);
      expect(result.data).toEqual([mockDeckResponse]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('findPublicDecks', () => {
    it('should call decksService.findPublicDecks and return pagination', async () => {
      const query: DeckListQueryDto = {
        page: 1,
        limit: 20,
        sort: 'createdAt:desc',
      };
      const mockResult = { data: [mockDeckResponse], total: 1 };
      decksService.findPublicDecks.mockResolvedValue(mockResult);

      const result = await controller.findPublicDecks(query);

      expect(decksService.findPublicDecks).toHaveBeenCalledWith(query);
      expect(result.data).toEqual([mockDeckResponse]);
    });
  });

  describe('findOne', () => {
    it('should call decksService.findById with user id', async () => {
      decksService.findById.mockResolvedValue(mockDeckResponse);

      const result = await controller.findOne('deck-123', mockCurrentUser);

      expect(decksService.findById).toHaveBeenCalledWith(
        'deck-123',
        'user-123',
      );
      expect(result.data).toEqual(mockDeckResponse);
    });

    it('should work without user for public access', async () => {
      decksService.findById.mockResolvedValue(mockDeckResponse);

      const result = await controller.findOne('deck-123', undefined);

      expect(decksService.findById).toHaveBeenCalledWith('deck-123', undefined);
      expect(result.data).toEqual(mockDeckResponse);
    });
  });

  describe('update', () => {
    it('should call decksService.update and return success response', async () => {
      const dto: UpdateDeckDto = { title: 'Updated' };
      decksService.update.mockResolvedValue(mockDeckResponse);

      const result = await controller.update(mockCurrentUser, 'deck-123', dto);

      expect(decksService.update).toHaveBeenCalledWith(
        'user-123',
        'deck-123',
        dto,
      );
      expect(result.data).toEqual(mockDeckResponse);
      expect(result.message).toBe('Deck updated');
    });
  });

  describe('delete', () => {
    it('should call decksService.delete and return success response', async () => {
      decksService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockCurrentUser, 'deck-123');

      expect(decksService.delete).toHaveBeenCalledWith('user-123', 'deck-123');
      expect(result.data).toBeNull();
      expect(result.message).toBe('Deck deleted');
    });
  });

  describe('uploadCover', () => {
    it('should call updateCoverUseCase.execute and return success response', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'cover.jpg',
      } as Express.Multer.File;
      updateCoverUseCase.execute.mockResolvedValue(mockDeckResponse);

      const result = await controller.uploadCover(
        mockCurrentUser,
        'deck-123',
        mockFile,
      );

      expect(updateCoverUseCase.execute).toHaveBeenCalledWith(
        'user-123',
        'deck-123',
        mockFile.buffer,
        mockFile.originalname,
      );
      expect(result.data).toEqual(mockDeckResponse);
      expect(result.message).toBe('Cover updated');
    });
  });

  describe('deleteCover', () => {
    it('should call decksService.deleteCover and return success response', async () => {
      decksService.deleteCover.mockResolvedValue(mockDeckResponse);

      const result = await controller.deleteCover(mockCurrentUser, 'deck-123');

      expect(decksService.deleteCover).toHaveBeenCalledWith(
        'user-123',
        'deck-123',
      );
      expect(result.data).toEqual(mockDeckResponse);
      expect(result.message).toBe('Cover deleted');
    });
  });
});
