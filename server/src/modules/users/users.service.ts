// src/modules/users/users.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from './users.repository';
import { UserMapper } from './mappers/user.mapper';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { AppException } from '../../common/filters/app-exception';
import { ERROR_CODES } from '../../common/constants/error-codes.const';
import { ICacheManager } from '../../common/interfaces/cache-manager.interface';
import { LoggerService } from '../../common/logger/logger.service';
import { hashPassword } from '../../common/utils/crypto.util';
import { CacheKeyBuilder, CACHE_TTL } from '../../common/utils/cache.util';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { User } from '@prisma/client';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { USER_EVENTS } from '../../common/constants/events.constants';

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
  ) {
    this.logger.setContext(UsersService.name);
    this.emitter = this.eventEmitter;
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, username, password, displayName, avatarUrl } = createUserDto;

    const existingEmail = await this.usersRepository.findByEmail(email);
    if (existingEmail) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ERROR_CODES.USER_EMAIL_DUPLICATE,
        'Email already exists',
      );
    }
    const existingUsername =
      await this.usersRepository.findByUsername(username);
    if (existingUsername) {
      throw new AppException(
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
      avatarUrl,
    });

    await this.invalidateListCache();
    const dto = this.userMapper.toResponseDto(user);

    // Emit event để các module khác (ví dụ NotificationModule) xử lý
    this.emitter.emit(USER_EVENTS.CREATED, {
      userId: user.id,
      email: user.email,
    });

    return dto;
  }

  async findAll(
    query: UserListQueryDto,
  ): Promise<{ data: UserResponseDto[]; total: number }> {
    const filters: Record<string, string | number> = {};
    if (query.search !== undefined) filters.search = query.search;
    if (query.role !== undefined) filters.role = query.role;
    if (query.status !== undefined) filters.status = query.status;
    if (query.sortBy !== undefined) filters.sortBy = query.sortBy;
    if (query.sortOrder !== undefined) filters.sortOrder = query.sortOrder;

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
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    const dto = this.userMapper.toResponseDto(user);
    await this.cacheManager.set(cacheKey, dto, CACHE_TTL.USER_PROFILE);
    return dto;
  }

  async findByEmail(email: string): Promise<User | null> {
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
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'You can only update your own profile',
      );
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    if (user.isBanned && currentUser.role !== 'ADMIN') {
      throw new AppException(
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
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        'You can only delete your own account',
      );
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
    }

    if (user.isBanned && currentUser.role !== 'ADMIN') {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'USER_ACCOUNT_BANNED',
        'Banned accounts cannot be deleted. Contact support.',
      );
    }

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
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
      );
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
      throw new AppException(
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
      throw new AppException(
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
    const uploadResult = await this.storageService.upload(
      fileBuffer,
      originalName,
      { folder: 'avatars' },
    );

    const user = await this.usersRepository.findById(userId);
    if (user?.avatarUrl) {
      const publicId = this.extractPublicIdFromUrl(user.avatarUrl);
      if (publicId) {
        await this.storageService.delete(publicId).catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to delete old avatar: ${errorMessage}`);
        });
      }
    }

    const updated = await this.usersRepository.update(userId, {
      avatarUrl: uploadResult.url,
    });
    await this.invalidateUserCache(userId);
    await this.invalidateListCache();
    return this.userMapper.toResponseDto(updated);
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
