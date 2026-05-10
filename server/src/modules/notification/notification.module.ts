// src/modules/notification/notification.module.ts
import { Module } from '@nestjs/common';
import { NotificationService } from '@modules/notification/notification.service';
import { PusherModule } from '@infrastructure/pusher/pusher.module';

@Module({
  imports: [PusherModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
