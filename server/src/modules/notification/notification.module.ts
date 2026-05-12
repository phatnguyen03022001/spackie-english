// src/modules/notification/notification.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationController } from '@modules/notification/notification.controller';
import { NotificationService } from '@modules/notification/notification.service';
import { NotificationRepository } from '@modules/notification/notification.repository';
import { NotificationListener } from '@modules/notification/notification.listener';
import { PusherModule } from '@infrastructure/pusher/pusher.module';

@Module({
  imports: [
    PusherModule,
    BullModule.registerQueue({
      name: 'notification',
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationListener,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
