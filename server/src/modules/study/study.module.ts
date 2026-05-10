// src/modules/study/study.module.ts
import { Module } from '@nestjs/common';
import { StudyController } from '@modules/study/study.controller';
import { StudyService } from '@modules/study/study.service';
import { StudyRepository } from '@modules/study/study.repository';
import { PusherModule } from '@infrastructure/pusher/pusher.module';

@Module({
  imports: [PusherModule],
  controllers: [StudyController],
  providers: [StudyService, StudyRepository],
  exports: [StudyService, StudyRepository],
})
export class StudyModule {}
