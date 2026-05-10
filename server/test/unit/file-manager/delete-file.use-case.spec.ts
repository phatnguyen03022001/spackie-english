import { Test, TestingModule } from '@nestjs/testing';
import { DeleteFileUseCase } from '@modules/file-manager/use-cases/delete-file.use-case';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { StorageService } from '@infrastructure/storage/storage.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { FILE_ERROR_CODES } from '@modules/file-manager/constants/file-limits.const';

describe('DeleteFileUseCase', () => {
  let useCase: DeleteFileUseCase;
  let fileRepository: jest.Mocked<FileManagerRepository>;
  let storageService: jest.Mocked<StorageService>;
  let cacheManager: jest.Mocked<ICacheManager>;

  const mockFile = {
    id: 'file123',
    userId: 'user123',
    publicId: 'pub123',
    refId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteFileUseCase,
        { provide: StorageService, useValue: { delete: jest.fn() } },
        {
          provide: FileManagerRepository,
          useValue: {
            findById: jest.fn(),
            delete: jest.fn(),
            countByRefId: jest.fn(),
          },
        },
        { provide: 'ICacheManager', useValue: { del: jest.fn() } },
        {
          provide: LoggerService,
          useValue: { setContext: jest.fn(), log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DeleteFileUseCase);
    fileRepository = module.get(FileManagerRepository);
    storageService = module.get(StorageService);
    cacheManager = module.get('ICacheManager');
  });

  it('should delete file successfully', async () => {
    fileRepository.findById.mockResolvedValue(mockFile as any);
    fileRepository.countByRefId.mockResolvedValue(0);
    storageService.delete.mockResolvedValue(undefined);

    await useCase.execute('file123', 'user123');

    expect(storageService.delete).toHaveBeenCalledWith('pub123');
    expect(fileRepository.delete).toHaveBeenCalledWith('file123');
    expect(cacheManager.del).toHaveBeenCalledWith('file:quota:user123');
  });

  it('should throw FILE_NOT_FOUND if file missing', async () => {
    fileRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute('file123', 'user123')).rejects.toThrow(
      BusinessException,
    );
    await expect(useCase.execute('file123', 'user123')).rejects.toMatchObject({
      response: { code: FILE_ERROR_CODES.FILE_NOT_FOUND },
    });
  });

  it('should throw FILE_FORBIDDEN if user not owner', async () => {
    fileRepository.findById.mockResolvedValue(mockFile as any);
    await expect(useCase.execute('file123', 'wrongUser')).rejects.toThrow(
      BusinessException,
    );
    await expect(useCase.execute('file123', 'wrongUser')).rejects.toMatchObject(
      {
        response: { code: FILE_ERROR_CODES.FILE_FORBIDDEN },
      },
    );
  });

  it('should throw FILE_IN_USE if file is referenced', async () => {
    fileRepository.findById.mockResolvedValue({
      ...mockFile,
      refId: 'card456',
    } as any);
    fileRepository.countByRefId.mockResolvedValue(1);
    await expect(useCase.execute('file123', 'user123')).rejects.toThrow(
      BusinessException,
    );
    await expect(useCase.execute('file123', 'user123')).rejects.toMatchObject({
      response: { code: FILE_ERROR_CODES.FILE_IN_USE },
    });
  });
});
