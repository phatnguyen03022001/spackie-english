// src/modules/vocab/vocab.module.ts
import { Module, Provider, Type } from '@nestjs/common';
import { ManagementController } from './controllers/management.controller';
import { ReviewController } from './controllers/review.controller';
import { ManagementService } from './services/management.service';
import { ReviewService } from './services/review.service';
import { UsersModule } from '../users/users.module';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [UsersModule],
  controllers: [ManagementController, ReviewController] as Type<unknown>[],
  providers: [ManagementService, ReviewService, AnalyticsService] as Provider[],
  exports: [ManagementService, ReviewService] as Provider[],
})
export class VocabModule {}
