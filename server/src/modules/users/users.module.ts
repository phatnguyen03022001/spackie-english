// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from '@modules/users/users.controller';
import { UsersService } from '@modules/users/users.service';
import { UsersRepository } from '@modules/users/users.repository';
import { UserMapper } from '@modules/users/mappers/user.mapper';
import { UpdateAvatarUseCase } from '@modules/users/use-cases/update-avatar.use-case';
import { StorageModule } from '@/infrastructure/storage/storage.module';
import { RedisModule } from '@/infrastructure/redis/redis.module';
import { LoggerModule } from '@/common/logger/logger.module';

@Module({
  imports: [StorageModule, RedisModule, LoggerModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UserMapper, UpdateAvatarUseCase],
  exports: [UsersService, UsersRepository, UserMapper],
})
export class UsersModule {}
