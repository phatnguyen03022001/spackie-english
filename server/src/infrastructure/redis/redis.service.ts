import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public readonly client: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const url = this.configService.get<string>('redis.url');
    if (!url) throw new Error('Redis URL is required');
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    this.logger.setContext(RedisService.name);
  }

  async onModuleInit() {
    await this.client.connect();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
