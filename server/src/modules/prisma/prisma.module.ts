import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot()], // Đảm bảo Config được load
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
