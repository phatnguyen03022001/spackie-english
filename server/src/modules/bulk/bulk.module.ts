// src/modules/bulk/bulk.module.ts
import { Module } from '@nestjs/common';
import { BulkController } from '@modules/bulk/bulk.controller';
import { BulkService } from '@modules/bulk/bulk.service';
import { PrismaModule } from '@database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BulkController],
  providers: [BulkService],
  exports: [BulkService],
})
export class BulkModule {}
