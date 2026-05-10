import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfigService {
  constructor(private configService: ConfigService) {}

  get url(): string {
    return this.configService.get<string>('database.url')!;
  }
  get poolSize(): number {
    return this.configService.get<number>('database.poolSize') ?? 10;
  }
  get poolMin(): number {
    return this.configService.get<number>('database.poolMin') ?? 2;
  }
}
