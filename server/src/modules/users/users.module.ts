// src/modules/users/users.module.ts
import { Module, Global } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Global() // Để các module khác không cần import lại UsersModule
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Rất quan trọng
})
export class UsersModule {}
