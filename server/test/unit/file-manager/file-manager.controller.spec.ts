import { Test, TestingModule } from '@nestjs/testing';
import { FileManagerController } from '@modules/file-manager/file-manager.controller';
import { FileManagerService } from '@modules/file-manager/file-manager.service';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { UploadFileUseCase } from '@modules/file-manager/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from '@modules/file-manager/use-cases/delete-file.use-case';
import { FileResponseDto } from '@modules/file-manager/dto/file-response.dto';
import { UploadFileDto } from '@modules/file-manager/dto/upload-file.dto';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { RequestUser } from '@common/interfaces/request-user.interface';

describe('FileManagerController', () => {
  let controller: FileManagerController;
  let uploadUseCase: jest.Mocked<UploadFileUseCase>;
  let deleteUseCase: jest.Mocked<DeleteFileUseCase>;
  let service: jest.Mocked<FileManagerService>;

  const mockUser: RequestUser = {
    id: 'user123',
    email: 'test@test.com',
    role: 'USER',
  };
  const mockFileDto = new FileResponseDto();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileManagerController],
      providers: [
        {
          provide: FileManagerService,
          useValue: { findById: jest.fn(), getSignedUrl: jest.fn() },
        },
        { provide: UploadFileUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteFileUseCase, useValue: { execute: jest.fn() } },
        {
          provide: FileManagerRepository,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(FileManagerController);
    service = module.get(FileManagerService);
    uploadUseCase = module.get(UploadFileUseCase);
    deleteUseCase = module.get(DeleteFileUseCase);
  });

  describe('upload', () => {
    it('should call use case and return success', async () => {
      const file = {
        buffer: Buffer.from(''),
        originalname: 'test.png',
      } as Express.Multer.File;
      const body: UploadFileDto = { refType: 'CARD_IMAGE', refId: 'card456' };
      uploadUseCase.execute.mockResolvedValue(mockFileDto);

      const result = await controller.upload(file, body, mockUser);

      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data).toBe(mockFileDto);
      expect(result.message).toBe('File uploaded successfully');
      expect(uploadUseCase.execute).toHaveBeenCalledWith(
        'user123',
        file,
        'CARD_IMAGE',
        'card456',
      );
    });
  });

  describe('delete', () => {
    it('should call use case and return success', async () => {
      deleteUseCase.execute.mockResolvedValue(undefined);
      const result = await controller.delete('file123', mockUser);
      expect(result).toBeInstanceOf(SuccessResponseDto);
      expect(result.data).toBeNull();
      expect(result.message).toBe('File deleted successfully');
      expect(deleteUseCase.execute).toHaveBeenCalledWith('file123', 'user123');
    });
  });

  describe('findOne', () => {
    it('should return file metadata', async () => {
      service.findById.mockResolvedValue(mockFileDto);
      const result = await controller.findOne('file123');
      expect(result.data).toBe(mockFileDto);
      expect(service.findById).toHaveBeenCalledWith('file123');
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL', async () => {
      service.getSignedUrl.mockResolvedValue('https://signed.com/file.jpg');
      const result = await controller.getSignedUrl('file123', mockUser);
      expect(result.data).toEqual({ url: 'https://signed.com/file.jpg' });
      expect(service.getSignedUrl).toHaveBeenCalledWith('file123', 'user123');
    });
  });
});
