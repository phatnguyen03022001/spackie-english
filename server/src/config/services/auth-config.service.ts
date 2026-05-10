import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthConfigService {
  constructor(private configService: ConfigService) {}

  get jwtSecret(): string {
    return this.configService.get<string>('auth.jwtSecret')!;
  }
  get jwtExpiresIn(): string {
    return this.configService.get<string>('auth.jwtExpiresIn') ?? '15m';
  }
  get jwtRefreshSecret(): string {
    return this.configService.get<string>('auth.jwtRefreshSecret')!;
  }
  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('auth.jwtRefreshExpiresIn') ?? '7d';
  }
  // [BỔ SUNG] hỗ trợ rotation
  get jwtPreviousSecret(): string | undefined {
    return this.configService.get<string>('auth.jwtPreviousSecret');
  }
  get bcryptSaltRounds(): number {
    return this.configService.get<number>('auth.bcryptSaltRounds') ?? 10;
  }
}
