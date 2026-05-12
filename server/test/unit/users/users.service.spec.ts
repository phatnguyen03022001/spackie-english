import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '@modules/users/users.service';
import { UsersRepository } from '@modules/users/users.repository';
import { UserMapper } from '@modules/users/mappers/user.mapper';
import { StorageService } from '@infrastructure/storage/storage.service';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { USER_EVENTS } from '@common/constants/events.constants';
import { UploadFileUseCase } from '@modules/file-manager/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from '@modules/file-manager/use-cases/delete-file.use-case';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { PrismaService } from '@database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let cacheManager: jest.Mocked<ICacheManager>;
  let userMapper: jest.Mocked<UserMapper>;
  let storageService: jest.Mocked<StorageService>;
  let logger: jest.Mocked<LoggerService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let uploadFileUseCase: jest.Mocked<UploadFileUseCase>;
  let fileManagerRepository: jest.Mocked<FileManagerRepository>;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    username: 'test',
    displayName: 'Test',
    isBanned: false,
    deletedAt: null,
    passwordHash: null,
    role: 'USER',
    provider: 'LOCAL',
    providerId: null,
    avatarUrl: null,
    isActive: true,
    isVerified: true,
    settings: {},
    totalCardsLearned: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStudiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserResponse = {
    id: 'user123',
    email: 'test@example.com',
    username: 'test',
  };

  const mockUsersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    ban: jest.fn(),
    unban: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    hardDelete: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    reset: jest.fn(),
    ping: jest.fn(),
  };

  const mockStorage = {
    upload: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockEventEmitter = { emit: jest.fn() };

  const mockMapper = {
    toResponseDto: jest.fn().mockReturnValue(mockUserResponse),
    toResponseDtoList: jest.fn().mockReturnValue([mockUserResponse]),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    deck: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: UserMapper, useValue: mockMapper },
        { provide: StorageService, useValue: mockStorage },
        { provide: 'ICacheManager', useValue: mockCacheManager },
        { provide: LoggerService, useValue: mockLogger },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: UploadFileUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DeleteFileUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FileManagerRepository,
          useValue: {
            findByUserId: jest.fn().mockResolvedValue([]),
            delete: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get(UsersService);
    usersRepository = module.get(UsersRepository);
    cacheManager = module.get('ICacheManager');
    userMapper = module.get(UserMapper);
    storageService = module.get(StorageService);
    logger = module.get(LoggerService);
    eventEmitter = module.get(EventEmitter2);
    uploadFileUseCase = module.get(UploadFileUseCase);
    fileManagerRepository = module.get(FileManagerRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return cached user if exists', async () => {
      cacheManager.get.mockResolvedValue(mockUserResponse);
      const result = await service.findById('user123');
      expect(result).toEqual(mockUserResponse);
      expect(usersRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw USER_NOT_FOUND when user missing', async () => {
      cacheManager.get.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        BusinessException,
      );
      await expect(service.findById('missing')).rejects.toMatchObject({
        response: { code: ERROR_CODES.USER_NOT_FOUND },
      });
    });

    it('should fetch from DB, cache and return DTO on cache miss', async () => {
      cacheManager.get.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(mockUser as any);

      const result = await service.findById('user123');

      expect(usersRepository.findById).toHaveBeenCalledWith('user123');
      expect(userMapper.toResponseDto).toHaveBeenCalledWith(mockUser);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('findByEmail', () => {
    it('should return cached user if exists', async () => {
      cacheManager.get.mockResolvedValue(mockUser);
      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(usersRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache on cache miss', async () => {
      cacheManager.get.mockResolvedValue(null);
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);

      const result = await service.findByEmail('test@example.com');

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      cacheManager.get.mockResolvedValue(null);
      usersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@test.com');
      expect(result).toBeNull();
    });

    it('should trim and lowercase email', async () => {
      cacheManager.get.mockResolvedValue(null);
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);

      await service.findByEmail('  Test@Example.com  ');
      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('findByUsername', () => {
    it('should return cached user if exists', async () => {
      cacheManager.get.mockResolvedValue(mockUser);
      const result = await service.findByUsername('test');
      expect(result).toEqual(mockUser);
      expect(usersRepository.findByUsername).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache on cache miss', async () => {
      cacheManager.get.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(mockUser as any);

      const result = await service.findByUsername('test');

      expect(usersRepository.findByUsername).toHaveBeenCalledWith('test');
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      cacheManager.get.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(null);

      const result = await service.findByUsername('unknown');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
      displayName: 'New User',
    };

    it('should create user and return DTO', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(mockUser as any);
      cacheManager.delPattern.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'new@example.com',
        true,
      );
      expect(usersRepository.findByUsername).toHaveBeenCalledWith('newuser');
      expect(usersRepository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        username: 'newuser',
        passwordHash: expect.any(String),
        displayName: 'New User',
      });
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(userMapper.toResponseDto).toHaveBeenCalledWith(mockUser);
      expect(eventEmitter.emit).toHaveBeenCalledWith(USER_EVENTS.CREATED, {
        userId: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
      });
      expect(result).toEqual(mockUserResponse);
    });

    it('should throw if email already exists', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.create(createDto)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.create(createDto)).rejects.toMatchObject({
        response: { code: ERROR_CODES.USER_EMAIL_DUPLICATE },
      });
    });

    it('should throw if username already taken', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(mockUser as any);

      await expect(service.create(createDto)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.create(createDto)).rejects.toMatchObject({
        response: { code: 'USER_USERNAME_DUPLICATE' },
      });
    });

    it('should trim and lowercase email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(mockUser as any);
      cacheManager.delPattern.mockResolvedValue(undefined);

      await service.create({ ...createDto, email: '  NEW@Example.com  ' });

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'new@example.com',
        true,
      );
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });

    it('should create user without password (OAuth)', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.findByUsername.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(mockUser as any);
      cacheManager.delPattern.mockResolvedValue(undefined);

      await service.create({
        email: 'oauth@test.com',
        username: 'oauth',
        password: undefined,
      });

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: undefined }),
      );
    });
  });

  describe('findAll', () => {
    const query = {
      page: 1,
      limit: 10,
      search: 'test',
      role: 'USER',
      status: 'ACTIVE',
      sort: 'createdAt_desc',
    };

    it('should return cached result if exists', async () => {
      const cachedResult = { data: [mockUserResponse], total: 1 };
      cacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findAll(query);

      expect(result).toEqual(cachedResult);
      expect(usersRepository.findAll).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache on cache miss', async () => {
      cacheManager.get.mockResolvedValue(null);
      usersRepository.findAll.mockResolvedValue({
        users: [mockUser as any],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(usersRepository.findAll).toHaveBeenCalledWith(query);
      expect(userMapper.toResponseDtoList).toHaveBeenCalledWith([mockUser]);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result).toEqual({ data: [mockUserResponse], total: 1 });
    });

    it('should work without optional filters', async () => {
      cacheManager.get.mockResolvedValue(null);
      usersRepository.findAll.mockResolvedValue({ users: [], total: 0 });

      await service.findAll({ page: 1, limit: 10, sort: 'createdAt:desc' });

      expect(usersRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sort: 'createdAt:desc',
      });
    });
  });

  describe('update', () => {
    const updateDto = { displayName: 'Updated Name' };
    const currentUser = { id: 'user123', role: 'USER' } as any;

    it('should throw FORBIDDEN if not admin and not own profile', async () => {
      const otherUser = { id: 'other', role: 'USER' } as any;

      await expect(
        service.update('user123', updateDto, otherUser),
      ).rejects.toThrow(BusinessException);
      await expect(
        service.update('user123', updateDto, otherUser),
      ).rejects.toMatchObject({
        response: { code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS },
      });
    });

    it('should throw NOT_FOUND if user missing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('user123', updateDto, currentUser),
      ).rejects.toThrow(BusinessException);
      await expect(
        service.update('user123', updateDto, currentUser),
      ).rejects.toMatchObject({
        response: { code: ERROR_CODES.USER_NOT_FOUND },
      });
    });

    it('should throw FORBIDDEN if banned user tries to update', async () => {
      usersRepository.findById.mockResolvedValue({
        ...mockUser,
        isBanned: true,
      } as any);

      await expect(
        service.update('user123', updateDto, currentUser),
      ).rejects.toThrow(BusinessException);
      await expect(
        service.update('user123', updateDto, currentUser),
      ).rejects.toMatchObject({
        response: { code: 'USER_ACCOUNT_BANNED' },
      });
    });

    it('should allow admin to update banned user', async () => {
      const adminUser = { id: 'admin1', role: 'ADMIN' } as any;
      usersRepository.findById.mockResolvedValue({
        ...mockUser,
        isBanned: true,
      } as any);
      usersRepository.update.mockResolvedValue(mockUser as any);
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      await service.update('user123', updateDto, adminUser);

      expect(usersRepository.update).toHaveBeenCalledWith('user123', updateDto);
      expect(eventEmitter.emit).toHaveBeenCalledWith(USER_EVENTS.UPDATED, {
        userId: 'user123',
      });
    });

    it('should update and invalidate caches', async () => {
      usersRepository.findById.mockResolvedValue(mockUser as any);
      usersRepository.update.mockResolvedValue({
        ...mockUser,
        displayName: 'Updated Name',
      } as any);
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      const result = await service.update('user123', updateDto, currentUser);

      expect(usersRepository.update).toHaveBeenCalledWith('user123', updateDto);
      expect(cacheManager.del).toHaveBeenCalledTimes(3); // user, email, username caches
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(USER_EVENTS.UPDATED, {
        userId: 'user123',
      });
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('softDelete', () => {
    const currentUser = { id: 'user123', role: 'USER' } as any;

    it('should throw FORBIDDEN if not admin and not own account', async () => {
      const otherUser = { id: 'other', role: 'USER' } as any;

      await expect(service.softDelete('user123', otherUser)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw NOT_FOUND if user missing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.softDelete('user123', currentUser)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw FORBIDDEN if banned user tries to delete', async () => {
      usersRepository.findById.mockResolvedValue({
        ...mockUser,
        isBanned: true,
      } as any);

      await expect(service.softDelete('user123', currentUser)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should soft delete and invalidate caches', async () => {
      usersRepository.findById.mockResolvedValue(mockUser as any);
      usersRepository.softDelete.mockResolvedValue(undefined as any);
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      await service.softDelete('user123', currentUser);

      expect(usersRepository.softDelete).toHaveBeenCalledWith('user123');
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(USER_EVENTS.DELETED, {
        userId: 'user123',
      });
    });
  });

  describe('hardDelete', () => {
    it('should throw NOT_FOUND if user missing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.hardDelete('missing')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should hard delete and invalidate caches', async () => {
      usersRepository.findById.mockResolvedValue(mockUser as any);
      usersRepository.hardDelete.mockResolvedValue(undefined as any);
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      await service.hardDelete('user123');

      expect(usersRepository.findById).toHaveBeenCalledWith('user123', true);
      expect(usersRepository.hardDelete).toHaveBeenCalledWith('user123');
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(USER_EVENTS.DELETED, {
        userId: 'user123',
      });
    });
  });

  describe('ban', () => {
    it('should throw NOT_FOUND if user missing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.ban('missing')).rejects.toThrow(BusinessException);
    });

    it('should ban user and invalidate caches', async () => {
      usersRepository.findById.mockResolvedValue(mockUser as any);
      usersRepository.ban.mockResolvedValue({
        ...mockUser,
        isBanned: true,
      } as any);
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      const result = await service.ban('user123');

      expect(usersRepository.ban).toHaveBeenCalledWith('user123');
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(USER_EVENTS.BANNED, {
        userId: 'user123',
      });
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('unban', () => {
    it('should throw NOT_FOUND if user missing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.unban('missing')).rejects.toThrow(BusinessException);
    });

    it('should unban user and invalidate caches', async () => {
      usersRepository.findById.mockResolvedValue(mockUser as any);
      usersRepository.unban.mockResolvedValue(mockUser as any);
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      const result = await service.unban('user123');

      expect(usersRepository.unban).toHaveBeenCalledWith('user123');
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(USER_EVENTS.UNBANNED, {
        userId: 'user123',
      });
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('updateAvatar', () => {
    const fileBuffer = Buffer.from('avatar-data');
    const originalName = 'avatar.jpg';

    const mockUploadedFile = {
      id: 'file123',
      url: 'https://example.com/avatars/new.jpg',
      publicId: 'avatars/new',
      format: 'jpg',
      size: 100,
      userId: 'user123',
      refType: 'AVATAR',
      refId: 'user123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      uploadFileUseCase.execute.mockResolvedValue(mockUploadedFile as any);
    });

    it('should upload new avatar and update user', async () => {
      usersRepository.findById.mockResolvedValue(mockUser as any);
      usersRepository.update.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'https://example.com/avatars/new.jpg',
      } as any);
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      const result = await service.updateAvatar(
        'user123',
        fileBuffer,
        originalName,
      );

      expect(uploadFileUseCase.execute).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ originalname: originalName }),
        'AVATAR',
        'user123',
      );
      expect(usersRepository.update).toHaveBeenCalledWith('user123', {
        avatarUrl: 'https://example.com/avatars/new.jpg',
      });
      expect(cacheManager.del).toHaveBeenCalled();
      expect(cacheManager.delPattern).toHaveBeenCalled();
      expect(result).toEqual(mockUserResponse);
    });

    it('should delete old avatar if exists', async () => {
      const userWithAvatar = {
        ...mockUser,
        avatarUrl: 'https://example.com/upload/v12345/old_avatar.jpg',
      };
      fileManagerRepository.findByUserId.mockResolvedValue([
        { id: 'old-file-id', publicId: 'old_avatar', refType: 'AVATAR' } as any,
      ]);
      usersRepository.findById.mockResolvedValue(userWithAvatar as any);
      usersRepository.update.mockResolvedValue({
        ...userWithAvatar,
        avatarUrl: 'https://example.com/avatars/new.jpg',
      } as any);
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      await service.updateAvatar('user123', fileBuffer, originalName);

      expect(storageService.delete).toHaveBeenCalledWith('old_avatar');
    });

    it('should not fail if old avatar delete fails', async () => {
      const userWithAvatar = {
        ...mockUser,
        avatarUrl: 'https://example.com/upload/v12345/old_avatar.jpg',
      };
      fileManagerRepository.findByUserId.mockResolvedValue([
        { id: 'old-file-id', publicId: 'old_avatar', refType: 'AVATAR' } as any,
      ]);
      usersRepository.findById.mockResolvedValue(userWithAvatar as any);
      usersRepository.update.mockResolvedValue({
        ...userWithAvatar,
        avatarUrl: 'https://example.com/avatars/new.jpg',
      } as any);
      storageService.delete.mockRejectedValue(new Error('Delete failed'));
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      await expect(
        service.updateAvatar('user123', fileBuffer, originalName),
      ).resolves.not.toThrow();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should work if user has no existing avatar', async () => {
      fileManagerRepository.findByUserId.mockResolvedValue([]);
      usersRepository.findById.mockResolvedValue(mockUser as any);
      usersRepository.update.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'https://example.com/avatars/new.jpg',
      } as any);
      cacheManager.del.mockResolvedValue(undefined);
      cacheManager.delPattern.mockResolvedValue(undefined);

      await service.updateAvatar('user123', fileBuffer, originalName);

      expect(storageService.delete).not.toHaveBeenCalled();
    });
  });

  describe('findByIdForAuth', () => {
    it('should return user from repository', async () => {
      usersRepository.findById.mockResolvedValue(mockUser as any);
      const result = await service.findByIdForAuth('user123');
      expect(usersRepository.findById).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockUser);
    });

    it('should return null if not found', async () => {
      usersRepository.findById.mockResolvedValue(null);
      const result = await service.findByIdForAuth('missing');
      expect(result).toBeNull();
    });
  });
});
