import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageConfigService {
  constructor(private configService: ConfigService) {}

  get provider(): string {
    return this.configService.get<string>('storage.provider') ?? 'cloudinary';
  }
  get cloudName(): string | undefined {
    return this.configService.get<string>('storage.cloudName');
  }
  get apiKey(): string | undefined {
    return this.configService.get<string>('storage.apiKey');
  }
  get apiSecret(): string | undefined {
    return this.configService.get<string>('storage.apiSecret');
  }
}
