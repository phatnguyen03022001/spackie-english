// src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AiController } from '@modules/ai/ai.controller';
import { AiService } from '@modules/ai/ai.service';
import { AiRepository } from '@modules/ai/ai.repository';

@Module({
  controllers: [AiController],
  providers: [AiService, AiRepository],
  exports: [AiService],
})
export class AiModule {}
