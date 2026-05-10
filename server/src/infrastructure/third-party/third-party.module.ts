import { Module, Global } from '@nestjs/common';
import { DeepSeekClient } from '@infrastructure/third-party/deepseek.client';
import { MapTilerClient } from '@infrastructure/third-party/maptiler.client';
import { PixabayClient } from '@infrastructure/third-party/pixabay.client';
import { GoogleTtsClient } from '@infrastructure/third-party/google-tts.client';
import { WordValidatorClient } from '@infrastructure/third-party/word-validator.client';
import { DeepSeekHealthIndicator } from '@infrastructure/third-party/deepseek.health';
import { MapTilerHealthIndicator } from '@infrastructure/third-party/maptiler.health';
import { PixabayHealthIndicator } from '@infrastructure/third-party/pixabay.health';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@config/config.module';

@Global()
@Module({
  imports: [TerminusModule, ConfigModule],
  providers: [
    DeepSeekClient,
    MapTilerClient,
    PixabayClient,
    GoogleTtsClient,
    WordValidatorClient,
    DeepSeekHealthIndicator,
    MapTilerHealthIndicator,
    PixabayHealthIndicator,
  ],
  exports: [
    DeepSeekClient,
    MapTilerClient,
    PixabayClient,
    GoogleTtsClient,
    WordValidatorClient,
    DeepSeekHealthIndicator,
    MapTilerHealthIndicator,
    PixabayHealthIndicator,
  ],
})
export class ThirdPartyModule {}
