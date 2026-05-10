import { Test, TestingModule } from '@nestjs/testing';
import { UpdateAvatarUseCase } from '@modules/users/use-cases/update-avatar.use-case';
import { UsersService } from '@modules/users/users.service';
import { BusinessException } from '@common/filters/business.exception';

describe('UpdateAvatarUseCase', () => {
  let useCase: UpdateAvatarUseCase;
  let usersService: jest.Mocked<UsersService>;

  const mockResponseDto = {
    id: 'user1',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateAvatarUseCase,
        {
          provide: UsersService,
          useValue: {
            updateAvatar: jest.fn().mockResolvedValue(mockResponseDto),
          },
        },
      ],
    }).compile();

    useCase = module.get(UpdateAvatarUseCase);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should throw FILE_MISSING if no file provided', async () => {
      await expect(useCase.execute('user1', null as any)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should call usersService.updateAvatar with correct params', async () => {
      const file = {
        buffer: Buffer.from('fake-image'),
        originalname: 'avatar.jpg',
      } as Express.Multer.File;

      const result = await useCase.execute('user1', file);

      expect(usersService.updateAvatar).toHaveBeenCalledWith(
        'user1',
        file.buffer,
        file.originalname,
      );
      expect(result).toEqual(mockResponseDto);
    });

    it('should propagate error from usersService.updateAvatar', async () => {
      const file = {
        buffer: Buffer.from('fake-image'),
        originalname: 'avatar.jpg',
      } as Express.Multer.File;
      usersService.updateAvatar.mockRejectedValue(
        new BusinessException(500, 'UPLOAD_FAILED', 'Upload failed'),
      );

      await expect(useCase.execute('user1', file)).rejects.toThrow(
        BusinessException,
      );
    });
  });
});
