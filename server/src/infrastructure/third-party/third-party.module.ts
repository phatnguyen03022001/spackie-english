import { Module, Global } from '@nestjs/common';
import { DeepSeekClient } from './deepseek.client';
import { MapTilerClient } from './maptiler.client';
import { PixabayClient } from './pixabay.client';
import { DeepSeekHealthIndicator } from './deepseek.health';
import { MapTilerHealthIndicator } from './maptiler.health';
import { PixabayHealthIndicator } from './pixabay.health';
import { TerminusModule } from '@nestjs/terminus';

@Global()
@Module({
  imports: [TerminusModule],
  providers: [
    DeepSeekClient,
    MapTilerClient,
    PixabayClient,
    DeepSeekHealthIndicator,
    MapTilerHealthIndicator,
    PixabayHealthIndicator,
  ],
  exports: [
    DeepSeekClient,
    MapTilerClient,
    PixabayClient,
    DeepSeekHealthIndicator,
    MapTilerHealthIndicator,
    PixabayHealthIndicator,
  ],
})
export class ThirdPartyModule {}
