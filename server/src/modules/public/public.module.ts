// src/modules/public/public.module.ts
import { Module } from '@nestjs/common';
import { PublicController } from '@modules/public/public.controller';
import { PublicService } from '@modules/public/public.service';
import { PrismaModule } from '@database/prisma.module';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
