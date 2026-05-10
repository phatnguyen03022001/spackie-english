import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PixabayConfigService {
  constructor(private configService: ConfigService) {}

  get apiKey(): string | undefined {
    return this.configService.get<string>('pixabay.apiKey');
  }
  get apiUrl(): string {
    return (
      this.configService.get<string>('pixabay.apiUrl') ??
      'https://pixabay.com/api/'
    );
  }
  get timeout(): number {
    return this.configService.get<number>('pixabay.timeout') ?? 10000;
  }
  get perPage(): number {
    return this.configService.get<number>('pixabay.perPage') ?? 3;
  }
}
