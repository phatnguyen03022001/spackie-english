import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseApiClient } from './base.client';
import { LoggerService } from '@common/logger/logger.service';

export interface PixabayImage {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  downloads: number;
  likes: number;
  comments: number;
  userId: number;
  user: string;
  userImageURL: string;
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

@Injectable()
export class PixabayClient extends BaseApiClient {
  private readonly apiKey: string | undefined;
  private readonly perPage: number;

  constructor(configService: ConfigService, logger: LoggerService) {
    const apiKey = configService.get<string>('pixabay.apiKey');
    const apiUrl =
      configService.get<string>('pixabay.apiUrl') || 'https://pixabay.com/api/';
    const timeout = configService.get<number>('pixabay.timeout') || 10000;
    super(apiUrl, timeout, logger, 2, 1000);
    this.apiKey = apiKey;
    this.perPage = configService.get<number>('pixabay.perPage') || 3;
  }

  async searchImages(query: string, perPage?: number): Promise<PixabayImage[]> {
    if (!this.apiKey) {
      this.logger.warn('Pixabay API key not configured, skipping image search');
      return [];
    }

    try {
      const response = await this.get<PixabayResponse>('', {
        params: {
          key: this.apiKey,
          q: encodeURIComponent(query),
          image_type: 'photo',
          per_page: perPage || this.perPage,
          safesearch: true,
        },
      });
      return response.hits || [];
    } catch (error) {
      this.logger.error({ error, query }, 'Pixabay search failed');
      return []; // fallback: không throw lỗi, chỉ trả về mảng rỗng
    }
  }

  async getFirstImageUrl(query: string): Promise<string | null> {
    const images = await this.searchImages(query, 1);
    return images.length > 0 ? images[0].webformatURL : null;
  }

  async ping(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    try {
      await this.searchImages('test', 1);
      return true;
    } catch {
      return false;
    }
  }
}
