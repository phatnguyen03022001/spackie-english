import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get env(): string {
    return this.configService.get<string>('app.env') ?? 'development';
  }
  get isProduction(): boolean {
    return this.env === 'production';
  }
  get isDevelopment(): boolean {
    return this.env === 'development';
  }
  get name(): string {
    return this.configService.get<string>('app.name') ?? 'NestJS Server';
  }
  get port(): number {
    return this.configService.get<number>('app.port') ?? 8000;
  }
  get prefix(): string {
    return this.configService.get<string>('app.prefix') ?? 'api';
  }
  get frontendUrl(): string {
    return (
      this.configService.get<string>('app.frontendUrl') ??
      'http://localhost:3000'
    );
  }
  get frontendStagingUrl(): string | undefined {
    return this.configService.get<string>('app.frontendStagingUrl');
  }
  get defaultPageSize(): number {
    return this.configService.get<number>('app.defaultPageSize') ?? 20;
  }
  get vercelTeamSlug(): string | undefined {
    return this.configService.get<string>('app.vercelTeamSlug');
  }
  get swaggerEnable(): boolean {
    return this.configService.get<boolean>('app.swagger.enable') ?? false;
  }
  get swaggerPath(): string {
    return this.configService.get<string>('app.swagger.path') ?? 'docs';
  }
  get swaggerTitle(): string {
    return this.configService.get<string>('app.swagger.title') ?? 'Spackie API';
  }
  get swaggerDescription(): string {
    return (
      this.configService.get<string>('app.swagger.description') ??
      'API Description'
    );
  }
  get swaggerVersion(): string {
    return this.configService.get<string>('app.swagger.version') ?? '1.0';
  }
  get corsAllowedOrigins(): string[] {
    return this.configService.get<string[]>('app.cors.allowedOrigins') ?? [];
  }
}
