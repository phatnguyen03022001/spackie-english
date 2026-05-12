// src/modules/app-info/app-info.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { SkipTransform } from '@common/decorators/skip-transform.decorator';

@ApiTags('App Info')
@Controller('app')
export class AppInfoController {
  private readonly version: string;
  private readonly buildTime: string;
  private readonly commitSha: string;

  constructor() {
    this.version = process.env.npm_package_version || '0.0.1';
    this.buildTime = process.env.BUILD_TIME || new Date().toISOString();
    this.commitSha = process.env.COMMIT_SHA || 'unknown';
  }

  @Get('version')
  @Public()
  @SkipTransform()
  @ApiOperation({ summary: 'Get app version information' })
  @ApiResponse({ status: 200, description: 'Version info' })
  getVersion(): {
    version: string;
    buildTime: string;
    commitSha: string;
  } {
    return {
      version: this.version,
      buildTime: this.buildTime,
      commitSha: this.commitSha,
    };
  }

  @Get('config')
  @Public()
  @SkipTransform()
  @ApiOperation({ summary: 'Get public app configuration' })
  @ApiResponse({ status: 200, description: 'Public config' })
  getConfig(): {
    maxUploadSize: number;
    supportedLanguages: string[];
    defaultPageSize: number;
    features: {
      batchCreation: boolean;
      aiHint: boolean;
      listening: boolean;
      search: boolean;
      recommendations: boolean;
    };
  } {
    return {
      maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '5242880', 10),
      supportedLanguages: ['en', 'vi'],
      defaultPageSize: 10,
      features: {
        batchCreation: true,
        aiHint: true,
        listening: true,
        search: true,
        recommendations: true,
      },
    };
  }
}
