import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '@infrastructure/storage/storage.service';
import { StorageProvider } from '@infrastructure/storage/storage.provider';

describe('StorageService', () => {
  let service: StorageService;
  let mockProvider: jest.Mocked<StorageProvider>;

  beforeEach(async () => {
    mockProvider = {
      upload: jest.fn(),
      delete: jest.fn(),
      ping: jest.fn(),
      getSignedUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: 'STORAGE_PROVIDER',
          useValue: mockProvider,
        },
      ],
    }).compile();

    service = module.get(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    const buffer = Buffer.from('test-data');
    const originalName = 'test.jpg';

    it('should delegate to provider.upload', async () => {
      const uploadResult = {
        url: 'https://example.com/test.jpg',
        publicId: 'uploads/test',
        format: 'jpg',
        size: 100,
      };
      mockProvider.upload.mockResolvedValue(uploadResult);

      const result = await service.upload(buffer, originalName, {
        folder: 'images',
      });

      expect(mockProvider.upload).toHaveBeenCalledWith(buffer, originalName, {
        folder: 'images',
      });
      expect(result).toEqual(uploadResult);
    });

    it('should work without options', async () => {
      mockProvider.upload.mockResolvedValue({
        url: 'https://example.com/test.jpg',
        publicId: 'uploads/test',
        format: 'jpg',
        size: 100,
      });

      await service.upload(buffer, originalName);
      expect(mockProvider.upload).toHaveBeenCalledWith(
        buffer,
        originalName,
        undefined,
      );
    });

    it('should propagate error on failure', async () => {
      mockProvider.upload.mockRejectedValue(new Error('Upload failed'));
      await expect(service.upload(buffer, originalName)).rejects.toThrow(
        'Upload failed',
      );
    });
  });

  describe('delete', () => {
    it('should delegate to provider.delete', async () => {
      mockProvider.delete.mockResolvedValue();
      await service.delete('public-id');
      expect(mockProvider.delete).toHaveBeenCalledWith('public-id');
    });

    it('should propagate error on failure', async () => {
      mockProvider.delete.mockRejectedValue(new Error('Delete failed'));
      await expect(service.delete('public-id')).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('ping', () => {
    it('should delegate to provider.ping', async () => {
      mockProvider.ping.mockResolvedValue();
      await service.ping();
      expect(mockProvider.ping).toHaveBeenCalled();
    });
  });

  describe('getSignedUrl', () => {
    it('should delegate to provider.getSignedUrl', async () => {
      mockProvider.getSignedUrl.mockResolvedValue(
        'https://signed-url.com/file',
      );
      const result = await service.getSignedUrl('public-id', 3600);
      expect(mockProvider.getSignedUrl).toHaveBeenCalledWith('public-id', 3600);
      expect(result).toBe('https://signed-url.com/file');
    });

    it('should work without expiresIn', async () => {
      mockProvider.getSignedUrl.mockResolvedValue(
        'https://signed-url.com/file',
      );
      await service.getSignedUrl('public-id');
      expect(mockProvider.getSignedUrl).toHaveBeenCalledWith(
        'public-id',
        undefined,
      );
    });
  });
});
