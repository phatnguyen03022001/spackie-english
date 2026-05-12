// src/modules/study-session/study-session.module.ts
import { Module } from '@nestjs/common';
import { StudySessionController } from '@modules/study-session/study-session.controller';
import { StudySessionService } from '@modules/study-session/study-session.service';
import { StudySessionRepository } from '@modules/study-session/study-session.repository';

@Module({
  controllers: [StudySessionController],
  providers: [StudySessionService, StudySessionRepository],
  exports: [StudySessionService],
})
export class StudySessionModule {}
