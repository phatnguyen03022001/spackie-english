import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerConfigService {
  constructor(private configService: ConfigService) {}

  get level(): string {
    return this.configService.get<string>('logger.level') ?? 'info';
  }
  get logRequestBody(): boolean {
    return this.configService.get<boolean>('logger.logRequestBody') ?? false;
  }
  get logResponseBody(): boolean {
    return this.configService.get<boolean>('logger.logResponseBody') ?? false;
  }
  get logBodyInProd(): boolean {
    return this.configService.get<boolean>('logger.logBodyInProd') ?? false;
  }
  get redactPaths(): string[] {
    return (
      this.configService.get<string[]>('logger.redactPaths') ?? [
        'password',
        'token',
        'refreshToken',
        'authorization',
        'cookie',
      ]
    );
  }
}
