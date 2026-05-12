// src/modules/recommend/recommend.module.ts
import { Module } from '@nestjs/common';
import { RecommendController } from '@modules/recommend/recommend.controller';
import { RecommendService } from '@modules/recommend/recommend.service';

@Module({
  controllers: [RecommendController],
  providers: [RecommendService],
  exports: [RecommendService],
})
export class RecommendModule {}
