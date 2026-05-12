// src/modules/report/report.module.ts
import { Module } from '@nestjs/common';
import { ReportController } from '@modules/report/report.controller';
import { ReportService } from '@modules/report/report.service';
import { ReportRepository } from '@modules/report/report.repository';

@Module({
  controllers: [ReportController],
  providers: [ReportService, ReportRepository],
  exports: [ReportService],
})
export class ReportModule {}
