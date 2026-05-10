import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ThrottlerRule {
  name: string;
  ttl: number;
  limit: number;
}

@Injectable()
export class ThrottlerConfigService {
  constructor(private configService: ConfigService) {}

  get options(): ThrottlerRule[] {
    return this.configService.get<ThrottlerRule[]>('throttler') ?? [];
  }

  get shortTtl(): number {
    const rule = this.options.find((r) => r.name === 'short');
    return rule?.ttl ?? 1000;
  }
  get shortLimit(): number {
    const rule = this.options.find((r) => r.name === 'short');
    return rule?.limit ?? 10;
  }
  get mediumTtl(): number {
    const rule = this.options.find((r) => r.name === 'medium');
    return rule?.ttl ?? 60000;
  }
  get mediumLimit(): number {
    const rule = this.options.find((r) => r.name === 'medium');
    return rule?.limit ?? 100;
  }
  get longTtl(): number {
    const rule = this.options.find((r) => r.name === 'long');
    return rule?.ttl ?? 3600000;
  }
  get longLimit(): number {
    const rule = this.options.find((r) => r.name === 'long');
    return rule?.limit ?? 1000;
  }
}
