import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MapConfigService {
  constructor(private configService: ConfigService) {}

  get provider(): string {
    return this.configService.get<string>('map.provider') ?? 'maptiler';
  }
  get apiKey(): string {
    return this.configService.get<string>('map.apiKey')!;
  }
  get tilesBaseUrl(): string {
    return (
      this.configService.get<string>('map.tilesBaseUrl') ??
      'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png'
    );
  }
}
