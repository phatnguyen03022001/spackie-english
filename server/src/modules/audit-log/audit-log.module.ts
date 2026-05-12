// src/modules/audit-log/audit-log.module.ts
import { Module } from '@nestjs/common';
import { AuditLogController } from '@modules/audit-log/audit-log.controller';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { AuditLogRepository } from '@modules/audit-log/audit-log.repository';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogRepository],
  exports: [AuditLogService],
})
export class AuditLogModule {}
