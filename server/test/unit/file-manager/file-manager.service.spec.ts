import { Test, TestingModule } from '@nestjs/testing';
import { FileManagerService } from '@modules/file-manager/file-manager.service';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { FileMapper } from '@modules/file-manager/mappers/file.mapper';
import { StorageService } from '@infrastructure/storage/storage.service';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { FileResponseDto } from '@modules/file-manager/dto/file-response.dto';
import { FILE_ERROR_CODES } from '@modules/file-manager/constants/file-limits.const';

describe('FileManagerService', () => {
  let service: FileManagerService;
  let fileRepository: jest.Mocked<FileManagerRepository>;
  let storageService: jest.Mocked<StorageService>;
  let fileMapper: jest.Mocked<FileMapper>;

  const mockFile = {
    id: 'file123',
    userId: 'user123',
    url: 'https://storage.com/file.jpg',
    publicId: 'public123',
    resourceType: 'image',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    refType: 'CARD_IMAGE',
    refId: 'card456',
    meta: {},
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileManagerService,
        {
          provide: FileManagerRepository,
          useValue: {
            findById: jest.fn(),
            findByUserId: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: { getSignedUrl: jest.fn(), upload: jest.fn() },
        },
        { provide: FileMapper, useValue: { toResponseDto: jest.fn() } },
        {
          provide: 'ICacheManager',
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        {
          provide: LoggerService,
          useValue: { setContext: jest.fn(), log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(FileManagerService);
    fileRepository = module.get(FileManagerRepository);
    storageService = module.get(StorageService);
    fileMapper = module.get(FileMapper);
  });

  describe('findById', () => {
    it('should return file DTO when found', async () => {
      const expectedDto = new FileResponseDto();
      fileRepository.findById.mockResolvedValue(mockFile as any);
      fileMapper.toResponseDto.mockReturnValue(expectedDto);

      const result = await service.findById('file123');
      expect(result).toBe(expectedDto);
      expect(fileRepository.findById).toHaveBeenCalledWith('file123');
    });

    it('should throw FILE_NOT_FOUND if file missing', async () => {
      fileRepository.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(
        BusinessException,
      );
      await expect(service.findById('missing')).rejects.toMatchObject({
        response: { code: FILE_ERROR_CODES.FILE_NOT_FOUND },
      });
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL for owner', async () => {
      fileRepository.findById.mockResolvedValue(mockFile as any);
      storageService.getSignedUrl.mockResolvedValue(
        'https://signed-url.com/file.jpg',
      );

      const url = await service.getSignedUrl('file123', 'user123');
      expect(url).toBe('https://signed-url.com/file.jpg');
      expect(storageService.getSignedUrl).toHaveBeenCalledWith(
        'public123',
        undefined,
      );
    });

    it('should throw FORBIDDEN if user is not owner', async () => {
      fileRepository.findById.mockResolvedValue(mockFile as any);
      await expect(
        service.getSignedUrl('file123', 'wrongUser'),
      ).rejects.toThrow(BusinessException);
      await expect(
        service.getSignedUrl('file123', 'wrongUser'),
      ).rejects.toMatchObject({
        response: { code: FILE_ERROR_CODES.FILE_FORBIDDEN },
      });
    });
  });

  describe('uploadFromUrl', () => {
    it('should fetch remote file, upload and save metadata', async () => {
      const mockBuffer = Buffer.from('fakeimage');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) =>
            key === 'content-type' ? 'image/jpeg' : '1024',
        },
        arrayBuffer: jest.fn().mockResolvedValue(mockBuffer),
      } as any);
      storageService.upload.mockResolvedValue({
        url: 'https://storage.com/uploaded.jpg',
        publicId: 'pub987',
        format: 'jpg',
        size: 1024,
      });
      fileRepository.create.mockResolvedValue({
        ...mockFile,
        id: 'newId',
      } as any);
      fileMapper.toResponseDto.mockReturnValue(new FileResponseDto());

      const result = await service.uploadFromUrl(
        'https://remote.com/image.jpg',
        {
          ownerUserId: 'user123',
          type: 'CARD_IMAGE' as any,
          entityId: 'card456',
          folder: 'cards/images',
        },
      );

      expect(result).toBeDefined();
      expect(storageService.upload).toHaveBeenCalledWith(
        mockBuffer,
        expect.any(String),
        { folder: 'cards/images' },
      );
      expect(fileRepository.create).toHaveBeenCalled();
    });
  });
});
