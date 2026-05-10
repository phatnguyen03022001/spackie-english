import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OTPConfigService {
  constructor(private configService: ConfigService) {}

  get ttl(): number {
    return this.configService.get<number>('otp.ttl') ?? 300;
  }
  get length(): number {
    return this.configService.get<number>('otp.length') ?? 6;
  }
}
