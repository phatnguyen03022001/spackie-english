// src/modules/settings/settings.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SettingsService } from '@modules/settings/settings.service';
import { UpdateSettingsDto } from '@modules/settings/dto/update-settings.dto';
import { SettingsResponseDto } from '@modules/settings/dto/settings-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { CacheTTL } from '@common/decorators/cache-ttl.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @CacheTTL(0) // Disable global caching for this endpoint
  @ApiOperation({ summary: 'Get current user settings' })
  @ApiResponse({ status: 200, description: 'Returns merged settings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMySettings(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<SettingsResponseDto>> {
    const settings = await this.settingsService.findByUserId(user.id);
    return new SuccessResponseDto(settings);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Update current user settings (partial)' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  @ApiResponse({ status: 400, description: 'SETTINGS_VALIDATION_FAILED' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMySettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SuccessResponseDto<SettingsResponseDto>> {
    const settings = await this.settingsService.update(user.id, dto);
    return new SuccessResponseDto(settings, 'Settings updated');
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset settings to defaults' })
  @ApiResponse({ status: 200, description: 'Settings reset to defaults' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resetMySettings(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<SettingsResponseDto>> {
    const settings = await this.settingsService.reset(user.id);
    return new SuccessResponseDto(settings, 'Settings reset to defaults');
  }

  @Get(':userId')
  @Roles('ADMIN')
  @CacheTTL(0) // Disable caching for admin endpoint as well
  @ApiOperation({ summary: 'Admin: get settings for any user' })
  @ApiResponse({
    status: 200,
    description: 'Returns settings for specified user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findByUserId(
    @Param('userId') userId: string,
  ): Promise<SuccessResponseDto<SettingsResponseDto>> {
    const settings = await this.settingsService.findByUserId(userId);
    return new SuccessResponseDto(settings);
  }
}
