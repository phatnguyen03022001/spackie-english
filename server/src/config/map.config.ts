// src/config/map.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('map', () => ({
  provider: process.env.MAP_PROVIDER || 'maptiler',
  apiKey: process.env.MAP_API_KEY,
  tilesBaseUrl:
    process.env.MAP_TILES_BASE_URL ||
    'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png',
}));
