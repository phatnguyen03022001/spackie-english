import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseApiClient } from './base.client';
import { LoggerService } from '@common/logger/logger.service';

export interface GeocodingResult {
  place_id: string;
  lat: number;
  lon: number;
  display_name: string;
  address: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

interface MapTilerFeature {
  id: string;
  center: [number, number];
  place_name: string;
  address?: {
    road?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

interface MapTilerGeocodeResponse {
  features: MapTilerFeature[];
}

@Injectable()
export class MapTilerClient extends BaseApiClient {
  private readonly apiKey: string;

  constructor(configService: ConfigService, logger: LoggerService) {
    const apiKey = configService.get<string>('map.apiKey');
    const baseUrl = 'https://api.maptiler.com';
    super(baseUrl, 10000, logger, 2, 1000);
    if (!apiKey) throw new Error('MapTiler API key is required');
    this.apiKey = apiKey;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  async geocode(query: string): Promise<GeocodingResult[]> {
    try {
      const response = await this.get<MapTilerGeocodeResponse>(
        `/geocoding/${encodeURIComponent(query)}.json`,
        {
          params: { key: this.apiKey, limit: 5 },
        },
      );
      return (response.features || []).map((feature) => ({
        place_id: feature.id,
        lat: feature.center[1],
        lon: feature.center[0],
        display_name: feature.place_name,
        address: {
          road: feature.address?.road,
          city: feature.address?.city || feature.address?.town,
          state: feature.address?.state,
          country: feature.address?.country,
          postcode: feature.address?.postcode,
        },
      }));
    } catch (error) {
      this.logger.error({ error, query }, 'MapTiler geocoding failed');
      throw new Error('Geocoding service unavailable');
    }
  }

  getStaticMapUrl(
    lat: number,
    lon: number,
    zoom = 14,
    width = 600,
    height = 400,
  ): string {
    return `https://api.maptiler.com/maps/streets-v2/static/${lon},${lat},${zoom}/${width}x${height}.png?key=${this.apiKey}`;
  }
}
