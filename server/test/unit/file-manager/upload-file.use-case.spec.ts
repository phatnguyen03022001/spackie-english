import { Test, TestingModule } from '@nestjs/testing';
import { UploadFileUseCase } from '@modules/file-manager/use-cases/upload-file.use-case';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { FileMapper } from '@modules/file-manager/mappers/file.mapper';
import { StorageService } from '@infrastructure/storage/storage.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { FILE_ERROR_CODES } from '@modules/file-manager/constants/file-limits.const';
import { FileRefType } from '@prisma/client';

describe('UploadFileUseCase', () => {
  let useCase: UploadFileUseCase;
  let fileRepository: jest.Mocked<FileManagerRepository>;
  let storageService: jest.Mocked<StorageService>;
  let fileMapper: jest.Mocked<FileMapper>;
  let cacheManager: jest.Mocked<ICacheManager>;

  const mockFileBuffer = Buffer.from('fake image');
  const mockMulterFile = {
    buffer: mockFileBuffer,
    originalname: 'test.png',
    mimetype: 'image/png',
    size: 1024,
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadFileUseCase,
        { provide: StorageService, useValue: { upload: jest.fn() } },
        {
          provide: FileManagerRepository,
          useValue: { create: jest.fn(), getTotalSizeByUserId: jest.fn() },
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

    useCase = module.get(UploadFileUseCase);
    fileRepository = module.get(FileManagerRepository);
    storageService = module.get(StorageService);
    fileMapper = module.get(FileMapper);
    cacheManager = module.get('ICacheManager');
  });

  it('should upload file successfully', async () => {
    cacheManager.get.mockResolvedValue(null);
    fileRepository.getTotalSizeByUserId.mockResolvedValue(10 * 1024 * 1024); // 10MB used
    storageService.upload.mockResolvedValue({
      url: 'https://storage.com/uploaded.png',
      publicId: 'pub123',
      format: 'png',
      size: 1024,
    });
    fileRepository.create.mockResolvedValue({ id: 'file123' } as any);
    fileMapper.toResponseDto.mockReturnValue({} as any);

    const result = await useCase.execute(
      'user123',
      mockMulterFile,
      FileRefType.CARD_IMAGE,
      'card456',
    );

    expect(result).toBeDefined();
    expect(storageService.upload).toHaveBeenCalledWith(
      mockFileBuffer,
      'test.png',
      { folder: 'cards/images' },
    );
    expect(fileRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://storage.com/uploaded.png',
        publicId: 'pub123',
        resourceType: 'image',
        mimeType: 'image/png',
        sizeBytes: 1024,
        refType: 'CARD_IMAGE',
        refId: 'card456',
      }),
    );
    expect(cacheManager.del).toHaveBeenCalledWith('file:quota:user123');
  });

  it('should throw FILE_QUOTA_EXCEEDED when quota exceeded', async () => {
    // Mock cache to return null so it fetches from DB
    cacheManager.get.mockResolvedValue(null);
    // 49MB used + 1KB new file > 50MB limit
    fileRepository.getTotalSizeByUserId.mockResolvedValue(
      FILE_ERROR_CODES.FILE_QUOTA_EXCEEDED
        ? 49 * 1024 * 1024
        : 49 * 1024 * 1024,
    );
    // Use a file that would exceed quota: 49MB used + 2MB new = 51MB > 50MB
    const largeFile = {
      ...mockMulterFile,
      size: 2 * 1024 * 1024,
      mimetype: 'image/png',
    };
    await expect(useCase.execute('user123', largeFile)).rejects.toThrow(
      BusinessException,
    );
    await expect(useCase.execute('user123', largeFile)).rejects.toMatchObject({
      response: { code: FILE_ERROR_CODES.FILE_QUOTA_EXCEEDED },
    });
  });

  it('should reject invalid MIME type', async () => {
    const invalidFile = { ...mockMulterFile, mimetype: 'application/exe' };
    await expect(useCase.execute('user123', invalidFile)).rejects.toThrow(
      BusinessException,
    );
    await expect(useCase.execute('user123', invalidFile)).rejects.toMatchObject(
      {
        response: { code: FILE_ERROR_CODES.FILE_TYPE_NOT_ALLOWED },
      },
    );
  });

  it('should reject oversized file', async () => {
    const largeFile = { ...mockMulterFile, size: 6 * 1024 * 1024 };
    await expect(useCase.execute('user123', largeFile)).rejects.toThrow(
      BusinessException,
    );
    await expect(useCase.execute('user123', largeFile)).rejects.toMatchObject({
      response: { code: FILE_ERROR_CODES.FILE_TOO_LARGE },
    });
  });
});
