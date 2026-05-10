import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PusherConfigService {
  constructor(private configService: ConfigService) {}

  get appId(): string | undefined {
    return this.configService.get<string>('pusher.appId');
  }
  get key(): string | undefined {
    return this.configService.get<string>('pusher.key');
  }
  get secret(): string | undefined {
    return this.configService.get<string>('pusher.secret');
  }
  get cluster(): string {
    return this.configService.get<string>('pusher.cluster') ?? 'ap1';
  }
  get useTLS(): boolean {
    return this.configService.get<boolean>('pusher.useTLS') ?? true;
  }
}
