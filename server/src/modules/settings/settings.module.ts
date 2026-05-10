// src/modules/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SettingsController } from '@modules/settings/settings.controller';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingsRepository } from '@modules/settings/settings.repository';
import { SettingsMapper } from '@modules/settings/mappers/settings.mapper';
import { LoggerModule } from '@/common/logger/logger.module';

@Module({
  imports: [LoggerModule, EventEmitterModule],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository, SettingsMapper],
  exports: [SettingsService],
})
export class SettingsModule {}
