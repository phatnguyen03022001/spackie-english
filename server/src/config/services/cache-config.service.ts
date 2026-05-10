import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheConfigService {
  constructor(private configService: ConfigService) {}

  get defaultTtl(): number {
    return this.configService.get<number>('cache.defaultTtl') ?? 300;
  }
  get idempotencyTtl(): number {
    return this.configService.get<number>('cache.idempotencyTtl') ?? 86400;
  }
  get idempotencyEnabled(): boolean {
    return this.configService.get<boolean>('cache.idempotencyEnabled') ?? true;
  }
}
