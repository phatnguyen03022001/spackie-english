// src/modules/queue-monitor/queue-monitor.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueMonitorController } from '@modules/queue-monitor/queue-monitor.controller';
import { QueueMonitorService } from '@modules/queue-monitor/queue-monitor.service';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notification',
    }),
    LoggerModule,
  ],
  controllers: [QueueMonitorController],
  providers: [QueueMonitorService],
  exports: [QueueMonitorService],
})
export class QueueMonitorModule {}
