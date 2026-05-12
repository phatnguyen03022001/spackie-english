// src/modules/health/health-dependencies.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis/redis.service';
import { PrismaService } from '@database/prisma.service';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { MailService } from '@infrastructure/mail/mail.service';
import { StorageService } from '@infrastructure/storage/storage.service';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { PixabayClient } from '@infrastructure/third-party/pixabay.client';
import { LoggerService } from '@common/logger/logger.service';
import { DependencyHealthDto } from '@modules/health/dto/dependency-health.dto';

@Injectable()
export class HealthDependenciesService {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly pusherService: PusherService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
    private readonly deepseekClient: DeepSeekClient,
    private readonly pixabayClient: PixabayClient,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(HealthDependenciesService.name);
  }

  async checkAll(): Promise<DependencyHealthDto[]> {
    const checks = await Promise.allSettled([
      this.checkRedis(),
      this.checkPrisma(),
      this.checkPusher(),
      this.checkMail(),
      this.checkStorage(),
      this.checkDeepSeek(),
      this.checkPixabay(),
    ]);

    return checks.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      const reason = result.reason as Error | undefined;
      return {
        name: 'unknown',
        status: 'down' as const,
        message: reason?.message || 'Unknown error',
      };
    });
  }

  private async checkRedis(): Promise<DependencyHealthDto> {
    const start = Date.now();
    try {
      await this.redisService.ping();
      return {
        name: 'redis',
        status: 'up',
        latencyMs: Date.now() - start,
        version: '6.x',
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'down',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkPrisma(): Promise<DependencyHealthDto> {
    const start = Date.now();
    try {
      const healthy = await this.prisma.isHealthy();
      return {
        name: 'database',
        status: healthy ? 'up' : 'down',
        latencyMs: Date.now() - start,
        version: 'MongoDB',
        ...(healthy ? {} : { message: 'Health check returned false' }),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'down',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkPusher(): Promise<DependencyHealthDto> {
    const start = Date.now();
    try {
      const result = await this.pusherService.ping();
      return {
        name: 'pusher',
        status: result ? 'up' : 'down',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'pusher',
        status: 'down',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkMail(): Promise<DependencyHealthDto> {
    const start = Date.now();
    try {
      await this.mailService.ping();
      return {
        name: 'mail',
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'mail',
        status: 'down',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkStorage(): Promise<DependencyHealthDto> {
    const start = Date.now();
    try {
      await this.storageService.ping();
      return {
        name: 'storage',
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'storage',
        status: 'down',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkDeepSeek(): Promise<DependencyHealthDto> {
    const start = Date.now();
    try {
      await this.deepseekClient.ping();
      return {
        name: 'deepseek',
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'deepseek',
        status: 'down',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkPixabay(): Promise<DependencyHealthDto> {
    const start = Date.now();
    try {
      await this.pixabayClient.ping();
      return {
        name: 'pixabay',
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'pixabay',
        status: 'down',
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}
