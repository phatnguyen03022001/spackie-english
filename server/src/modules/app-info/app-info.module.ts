// src/modules/app-info/app-info.module.ts
import { Module } from '@nestjs/common';
import { AppInfoController } from '@modules/app-info/app-info.controller';

@Module({
  controllers: [AppInfoController],
})
export class AppInfoModule {}
