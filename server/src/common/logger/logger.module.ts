// src/common/logger/logger.module.ts
import { Module, Global } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { loggerOptions } from './logger.options';
import { LoggerService } from './logger.service';

@Global()
@Module({
  imports: [PinoLoggerModule.forRootAsync(loggerOptions)],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
