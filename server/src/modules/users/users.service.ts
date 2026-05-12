// src/modules/users/users.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from '@modules/users/users.repository';
import { UserMapper } from '@modules/users/mappers/user.mapper';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';
import { UpdateUserRoleDto } from '@modules/users/dto/update-user-role.dto';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { UserListQueryDto } from '@modules/users/dto/user-list-query.dto';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { hashPassword, comparePassword } from '@common/utils/crypto.util';
import { CacheKeyBuilder, CACHE_TTL } from '@common/utils/cache.util';
import { StorageService } from '@infrastructure/storage/storage.service';
import { UploadFileUseCase } from '@modules/file-manager/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from '@modules/file-manager/use-cases/delete-file.use-case';
import { FileManagerRepository } from '@modules/file-manager/file-manager.repository';
import { PrismaService } from '@database/prisma.service';
import { User } from '@prisma/client';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { USER_EVENTS } from '@common/constants/events.constants';

@Injectable()
export class UsersService {
  private readonly domain = 'users';
  private readonly emitter: EventEmitter2;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userMapper: UserMapper,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly deleteFileUseCase: DeleteFileUseCase,
    private readonly fileManagerRepository: FileManagerRepository,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(UsersService.name);
    this.emitter = this.eventEmitter;
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const email = createUserDto.email.trim().toLowerCase();
    const { username, password, displayName } = createUserDto;

    const existingEmail = await this.usersRepository.findByEmail(email, true);
    if (existingEmail) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        ERROR_CODES.USER_EMAIL_DUPLICATE,
        'Email already exists',
      );
    }
    const existingUsername =
      await this.usersRepository.findByUsername(username);
    if (existingUsername) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'USER_USERNAME_DUPLICATE',
        'Username already taken',
      );
    }

    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const user = await this.usersRepository.create({
      email,
      username,
      passwordHash,
      displayName,
    });

    await this.invalidateListCache();
    const dto = this.userMapper.toResponseDto(user);

    // Emit event để các module khác (ví dụ NotificationModule) xử lý
    this.emitter.emit(USER_EVENTS.CREATED, {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    return dto;
  }

  async findAll(
    query: UserListQueryDto,
  ): Promise<{ data: UserResponseDto[]; total: number }> {
    const filters = {
      ...(query.search && { search: query.search }),
      ...(query.role && { role: query.role }),
      ...(query.status && { status: query.status }),
      sort: query.sort,
    };

    const cacheKey = CacheKeyBuilder.list(
      this.domain,
      'users',
      query.page,
      query.limit,
      filters,
    );
    const cached = await this.cacheManager.get<{
      data: UserResponseDto[];
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const { users, total } = await this.usersRepository.findAll(query);
    const data = this.userMapper.toResponseDtoList(users);
    const result = { data, total };
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.LIST);
    return result;
  }

  async findById(id: string): Promise<UserResponseDto> {
    const cacheKey = CacheKeyBuilder.resource(this.domain, 'user', id);
    const cached = await this.cacheManager.get<UserResponseDto>(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    const dto = this.userMapper.toResponseDto(user);
    await this.cacheManager.set(cacheKey, dto, CACHE_TTL.USER_PROFILE);
    return dto;
  }

  async findByEmail(emailInput: string): Promise<User | null> {
    const email = emailInput.trim().toLowerCase();
    const cacheKey = CacheKeyBuilder.resource(
      this.domain,
      'user_by_email',
      email,
    );
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepository.findByEmail(email);
    if (user) {
      await this.cacheManager.set(cacheKey, user, CACHE_TTL.USER_PROFILE);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    const cacheKey = CacheKeyBuilder.resource(
      this.domain,
      'user_by_username',
      username,
    );
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepository.findByUsername(username);
    if (user) {
      await this.cacheManager.set(cacheKey, user, CACHE_TTL.USER_PROFILE);
    }
    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: RequestUser,
  ): Promise<UserResponseDto> {
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'You can only update your own profile',
      );
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    if (user.isBanned && currentUser.role !== 'ADMIN') {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'USER_ACCOUNT_BANNED',
        'Your account has been banned. Cannot update profile.',
      );
    }

    const updated = await this.usersRepository.update(id, updateUserDto);
    await this.invalidateUserCache(id);
    await this.invalidateListCache();
    await this.invalidateEmailCache(user.email);
    if (updated.email !== user.email) {
      await this.invalidateEmailCache(updated.email);
    }
    await this.invalidateUsernameCache(user.username);
    if (updated.username !== user.username) {
      await this.invalidateUsernameCache(updated.username);
    }

    this.emitter.emit(USER_EVENTS.UPDATED, { userId: id });
    return this.userMapper.toResponseDto(updated);
  }

  async softDelete(id: string, currentUser: RequestUser): Promise<void> {
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'You can only delete your own account',
      );
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    if (user.isBanned && currentUser.role !== 'ADMIN') {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'USER_ACCOUNT_BANNED',
        'Banned accounts cannot be deleted. Contact support.',
      );
    }

    // Cascade soft delete to all decks owned by this user
    await this.prisma.deck.updateMany({
      where: { userId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    await this.usersRepository.softDelete(id);
    await this.invalidateUserCache(id);
    await this.invalidateListCache();
    await this.invalidateEmailCache(user.email);
    await this.invalidateUsernameCache(user.username);

    this.emitter.emit(USER_EVENTS.DELETED, { userId: id });
  }

  async hardDelete(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id, true);
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    // Cascade delete all files associated with this user
    const files = await this.fileManagerRepository.findByUserId(id);
    for (const file of files) {
      try {
        await this.storageService.delete(file.publicId);
        await this.fileManagerRepository.delete(file.id);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to delete file ${file.id} during user hard delete: ${errorMessage}`,
        );
      }
    }

    await this.usersRepository.hardDelete(id);
    await this.invalidateUserCache(id);
    await this.invalidateListCache();
    await this.invalidateEmailCache(user.email);
    await this.invalidateUsernameCache(user.username);

    this.emitter.emit(USER_EVENTS.DELETED, { userId: id });
  }

  async ban(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }
    const updated = await this.usersRepository.ban(id);
    await this.invalidateUserCache(id);
    await this.invalidateListCache();
    await this.invalidateEmailCache(user.email);
    await this.invalidateUsernameCache(user.username);

    this.emitter.emit(USER_EVENTS.BANNED, { userId: id });
    return this.userMapper.toResponseDto(updated);
  }

  async unban(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }
    const updated = await this.usersRepository.unban(id);
    await this.invalidateUserCache(id);
    await this.invalidateListCache();
    await this.invalidateEmailCache(user.email);
    await this.invalidateUsernameCache(user.username);

    this.emitter.emit(USER_EVENTS.UNBANNED, { userId: id });
    return this.userMapper.toResponseDto(updated);
  }

  async updateAvatar(
    userId: string,
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<UserResponseDto> {
    // Find existing avatar file to delete later
    const existingFiles = await this.fileManagerRepository.findByUserId(userId);
    const existingAvatar = existingFiles.find((f) => f.refType === 'AVATAR');

    // Upload via FileManager to create metadata record
    const multerFile = {
      buffer: fileBuffer,
      originalname: originalName,
      mimetype: 'image/jpeg',
      size: fileBuffer.length,
      fieldname: 'file',
      encoding: '7bit',
      destination: '',
      filename: originalName,
      path: '',
      stream: null as unknown as NodeJS.ReadableStream,
    } as Express.Multer.File;

    const uploadedFile = await this.uploadFileUseCase.execute(
      userId,
      multerFile,
      'AVATAR',
      userId,
    );

    // Delete old avatar file if exists (directly via repository to bypass refCount check)
    if (existingAvatar) {
      try {
        await this.storageService.delete(existingAvatar.publicId);
        await this.fileManagerRepository.delete(existingAvatar.id);
        await this.cacheManager.del(`file:quota:${userId}`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to delete old avatar: ${errorMessage}`);
      }
    }

    // Update user's avatarUrl
    const updated = await this.usersRepository.update(userId, {
      avatarUrl: uploadedFile.url,
    });
    await this.invalidateUserCache(userId);
    await this.invalidateListCache();
    return this.userMapper.toResponseDto(updated);
  }

  async updateRole(
    adminUserId: string,
    targetUserId: string,
    dto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    // Ngăn admin tự hạ role của chính mình
    if (adminUserId === targetUserId && dto.role !== 'ADMIN') {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        'CANNOT_DEMOTE_SELF',
        'You cannot demote yourself',
      );
    }

    const user = await this.usersRepository.findById(targetUserId);
    if (!user) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    const updated = await this.usersRepository.update(targetUserId, {
      role: dto.role,
    });
    await this.invalidateUserCache(targetUserId);
    await this.invalidateListCache();
    await this.invalidateEmailCache(user.email);
    await this.invalidateUsernameCache(user.username);

    this.emitter.emit(USER_EVENTS.UPDATED, { userId: targetUserId });
    return this.userMapper.toResponseDto(updated);
  }

  async verifyPassword(userId: string, password: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new BusinessException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.INVALID_PASSWORD,
        'Invalid password',
      );
    }
    const match = await comparePassword(password, user.passwordHash);
    if (!match) {
      throw new BusinessException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.INVALID_PASSWORD,
        'Invalid password',
      );
    }
  }

  async findByIdForAuth(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }
  private extractPublicIdFromUrl(url: string): string | null {
    const match = url.match(/\/upload\/v\d+\/(.+)\.[a-z]+$/);
    return match ? match[1] : null;
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const key = CacheKeyBuilder.resource(this.domain, 'user', userId);
    await this.cacheManager.del(key);
  }

  private async invalidateListCache(): Promise<void> {
    const pattern = CacheKeyBuilder.listPattern(this.domain, 'users');
    await this.cacheManager.delPattern(pattern);
  }

  private async invalidateEmailCache(email: string): Promise<void> {
    const key = CacheKeyBuilder.resource(this.domain, 'user_by_email', email);
    await this.cacheManager.del(key);
  }

  private async invalidateUsernameCache(username: string): Promise<void> {
    const key = CacheKeyBuilder.resource(
      this.domain,
      'user_by_username',
      username,
    );
    await this.cacheManager.del(key);
  }
}
