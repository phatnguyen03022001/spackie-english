// src/modules/settings/settings.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettingsRepository } from '@modules/settings/settings.repository';
import { SettingsMapper } from '@modules/settings/mappers/settings.mapper';
import { SettingsResponseDto } from '@modules/settings/dto/settings-response.dto';
import { UpdateSettingsDto } from '@modules/settings/dto/update-settings.dto';
import { DEFAULT_SETTINGS } from '@modules/settings/constants/default-settings';
import { validateSettings } from '@modules/settings/validators/settings.validator';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';

@Injectable()
export class SettingsService {
  private readonly domain = 'settings';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly settingsMapper: SettingsMapper,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(SettingsService.name);
  }

  async findByUserId(userId: string): Promise<SettingsResponseDto> {
    const cacheKey = this.buildCacheKey(userId);
    const cached = await this.cacheManager.get<SettingsResponseDto>(cacheKey);
    if (cached) return cached;

    const stored = await this.settingsRepository.findByUserId(userId);
    const merged = { ...DEFAULT_SETTINGS, ...stored };

    const dto = this.settingsMapper.toResponseDto(merged);

    await this.cacheManager.set(cacheKey, dto, this.CACHE_TTL);
    return dto;
  }

  async update(
    userId: string,
    dto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    const current = await this.settingsRepository.findByUserId(userId);

    const merged = {
      ...DEFAULT_SETTINGS,
      ...current,
      ...dto,
    };

    const errors = validateSettings(merged);
    if (errors.length > 0) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'SETTINGS_VALIDATION_FAILED',
        errors.join('; '),
      );
    }

    const toStore = this.extractDiff(merged);
    await this.settingsRepository.update(userId, toStore);

    await this.invalidateCache(userId);
    await this.invalidateGlobalInterceptorCache();

    this.logger.log(`Settings updated for user ${userId}`);

    this.eventEmitter.emit('settings.updated', {
      userId,
      updatedFields: Object.keys(dto),
    });

    // ✅ Quan trọng: Gọi lại findByUserId để lấy dữ liệu đã được merge và cache đúng
    return this.findByUserId(userId);
  }
  async reset(userId: string): Promise<SettingsResponseDto> {
    await this.settingsRepository.reset(userId);
    await this.invalidateCache(userId);
    await this.invalidateGlobalInterceptorCache();

    this.logger.log(`Settings reset for user ${userId}`);

    this.eventEmitter.emit('settings.updated', {
      userId,
      updatedFields: ['*'],
    });

    return this.settingsMapper.toResponseDto({ ...DEFAULT_SETTINGS });
  }

  private buildCacheKey(userId: string): string {
    return `${this.domain}:${userId}`;
  }

  private async invalidateCache(userId: string): Promise<void> {
    await this.cacheManager.del(this.buildCacheKey(userId));
  }

  private async invalidateGlobalInterceptorCache(): Promise<void> {
    await this.cacheManager.delPattern('cache:*settings*');
    await this.cacheManager.delPattern('*settings*');
  }

  private extractDiff(
    merged: Record<string, unknown>,
  ): Record<string, unknown> {
    const diff: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] !== value) {
        diff[key] = value;
      }
    }
    return diff;
  }
}
