// src/modules/feature/feature.controller.ts
import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { FeatureService } from '@modules/feature/feature.service';
import { Roles } from '@common/decorators/roles.decorator';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

class SetFlagDto {
  @IsString()
  key!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

@ApiTags('Admin - Feature Flags')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/features')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags (admin only)' })
  @ApiResponse({ status: 200, description: 'List of feature flags' })
  async getAllFlags(): Promise<SuccessResponseDto<unknown>> {
    const flags = await this.featureService.getAllFlags();
    return new SuccessResponseDto(flags, 'Feature flags fetched');
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific feature flag' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  async getFlag(
    @Param('key') key: string,
  ): Promise<SuccessResponseDto<unknown>> {
    const flag = await this.featureService.getFlag(key);
    return new SuccessResponseDto(flag, 'Feature flag fetched');
  }

  @Put()
  @ApiOperation({ summary: 'Create or update a feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag updated' })
  async setFlag(@Body() dto: SetFlagDto): Promise<SuccessResponseDto<unknown>> {
    const flag = await this.featureService.setFlag(
      dto.key,
      dto.enabled,
      dto.description,
    );
    return new SuccessResponseDto(flag, 'Feature flag updated');
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature flag (reset to default)' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  async deleteFlag(@Param('key') key: string): Promise<void> {
    await this.featureService.deleteFlag(key);
  }
}
