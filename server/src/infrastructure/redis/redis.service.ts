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
    const connectTimeout = parseInt(
      this.configService.get<string>('REDIS_CONNECT_TIMEOUT') || '10000',
      10,
    );
    const commandTimeout = parseInt(
      this.configService.get<string>('REDIS_COMMAND_TIMEOUT') || '5000',
      10,
    );
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout,
      commandTimeout,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
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
