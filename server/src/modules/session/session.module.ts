// src/modules/session/session.module.ts
import { Module } from '@nestjs/common';
import { SessionController } from '@modules/session/session.controller';
import { SessionService } from '@modules/session/session.service';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [RedisModule, LoggerModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
