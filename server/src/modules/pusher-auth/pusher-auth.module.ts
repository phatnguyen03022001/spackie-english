// src/modules/pusher-auth/pusher-auth.module.ts
import { Module } from '@nestjs/common';
import { PusherAuthController } from '@modules/pusher-auth/pusher-auth.controller';
import { PusherAuthService } from '@modules/pusher-auth/pusher-auth.service';
import { PusherModule } from '@infrastructure/pusher/pusher.module';
import { PrismaModule } from '@database/prisma.module';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [PusherModule, PrismaModule, LoggerModule],
  controllers: [PusherAuthController],
  providers: [PusherAuthService],
  exports: [PusherAuthService],
})
export class PusherAuthModule {}
