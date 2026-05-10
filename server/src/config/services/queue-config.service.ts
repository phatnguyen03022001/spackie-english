import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueConfigService {
  constructor(private configService: ConfigService) {}

  get prefix(): string {
    return this.configService.get<string>('queue.prefix') ?? 'bull';
  }
  get completedTtl(): number {
    return this.configService.get<number>('queue.completedTtl') ?? 86400;
  }
  get failedTtl(): number {
    return this.configService.get<number>('queue.failedTtl') ?? 604800;
  }
}
