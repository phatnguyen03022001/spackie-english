// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UserMapper } from './mappers/user.mapper';
import { UpdateAvatarUseCase } from './use-cases/update-avatar.use-case';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [StorageModule, RedisModule, LoggerModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UserMapper, UpdateAvatarUseCase],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
