// src/modules/listening/listening.module.ts
import { Module } from '@nestjs/common';
import { ListeningController } from '@modules/listening/listening.controller';
import { ListeningService } from '@modules/listening/listening.service';
import { ListeningRepository } from '@modules/listening/listening.repository';
import { PusherModule } from '@infrastructure/pusher/pusher.module';

@Module({
  imports: [PusherModule],
  controllers: [ListeningController],
  providers: [ListeningService, ListeningRepository],
  exports: [ListeningService, ListeningRepository],
})
export class ListeningModule {}
