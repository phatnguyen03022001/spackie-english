import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '@common/logger/logger.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const databaseUrl = configService.get<string>('database.url');
    const poolSize = configService.get<number>('database.poolSize') ?? 10;
    const poolMin = configService.get<number>('database.poolMin') ?? 2;

    let urlWithPool = databaseUrl;
    if (databaseUrl && !databaseUrl.includes('maxPoolSize=')) {
      const separator = databaseUrl.includes('?') ? '&' : '?';
      urlWithPool = `${databaseUrl}${separator}maxPoolSize=${poolSize}&minPoolSize=${poolMin}`;
    }

    super({
      datasources: { db: { url: urlWithPool } },
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });

    this.logger.setContext(PrismaService.name);
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$runCommandRaw({ ping: 1 });
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        { error: errorMessage },
        'Database health check failed',
      );
      return false;
    }
  }
}
