import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@common/logger/logger.service';
import { StorageService } from './storage.service';
import { CloudinaryProvider } from './cloudinary.provider';
import { StorageHealthIndicator } from './storage.health';
import { TerminusModule } from '@nestjs/terminus';

@Global()
@Module({
  imports: [TerminusModule],
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (config: ConfigService, logger: LoggerService) => {
        const provider = config.get<string>('storage.provider');
        if (provider === 'cloudinary') {
          const cloudName = config.get<string>('storage.cloudName');
          const apiKey = config.get<string>('storage.apiKey');
          const apiSecret = config.get<string>('storage.apiSecret');
          if (!cloudName || !apiKey || !apiSecret) {
            throw new Error('Cloudinary configuration missing');
          }
          return new CloudinaryProvider(
            { cloudName, apiKey, apiSecret },
            logger,
          );
        }
        throw new Error(`Unsupported storage provider: ${provider}`);
      },
      inject: [ConfigService, LoggerService],
    },
    StorageService,
    StorageHealthIndicator,
  ],
  exports: [StorageService, StorageHealthIndicator],
})
export class StorageModule {}
