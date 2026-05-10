import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseApiClient } from '@infrastructure/third-party/base.client';
import { LoggerService } from '@common/logger/logger.service';
import { isAxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';

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

  constructor(configService: ConfigService, logger: LoggerService) {
    const apiKey = configService.get<string>('pixabay.apiKey');
    const apiUrl =
      configService.get<string>('pixabay.apiUrl') || 'https://pixabay.com/api/';
    const timeout = configService.get<number>('pixabay.timeout') || 10000;
    super(apiUrl, timeout, logger, 2, 1000);
    this.apiKey = apiKey;
  }

  async searchImages(query: string): Promise<PixabayImage[]> {
    if (!this.apiKey) {
      this.logger.warn('Pixabay API key not configured, skipping image search');
      return [];
    }

    try {
      // Không gửi per_page để tránh lỗi 400 không xác định
      const params: Record<string, unknown> = {
        key: this.apiKey,
        q: query,
        image_type: 'photo',
        safesearch: true,
      };

      const config: AxiosRequestConfig = { params };
      const response = await this.get<PixabayResponse>('', config);
      return response.hits || [];
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        this.logger.error(
          `Pixabay error ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        );
      } else {
        this.logger.error(`Pixabay request failed: ${String(error)}`);
      }
      return [];
    }
  }

  async getFirstImageUrl(query: string): Promise<string | null> {
    const images = await this.searchImages(query);
    return images.length > 0 ? images[0].webformatURL : null;
  }

  async ping(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await this.searchImages('test');
      return true;
    } catch {
      return false;
    }
  }
}
