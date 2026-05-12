// src/modules/activity/activity.module.ts
import { Module } from '@nestjs/common';
import { ActivityController } from '@modules/activity/activity.controller';
import { ActivityService } from '@modules/activity/activity.service';
import { ActivityRepository } from '@modules/activity/activity.repository';

@Module({
  controllers: [ActivityController],
  providers: [ActivityService, ActivityRepository],
  exports: [ActivityService],
})
export class ActivityModule {}
