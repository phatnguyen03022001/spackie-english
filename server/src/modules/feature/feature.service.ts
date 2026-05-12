// src/modules/feature/feature.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { LoggerService } from '@common/logger/logger.service';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  rules?: Record<string, unknown>;
}

@Injectable()
export class FeatureService {
  private readonly FEATURE_PREFIX = 'feature:flag:';
  private readonly DEFAULT_TTL = 300; // 5 minutes

  // Default feature flags
  private readonly defaultFlags: Record<string, FeatureFlag> = {
    'search.enabled': {
      key: 'search.enabled',
      enabled: true,
      description: 'Enable global search functionality',
    },
    'recommendations.enabled': {
      key: 'recommendations.enabled',
      enabled: true,
      description: 'Enable deck and card recommendations',
    },
    'ai.features.enabled': {
      key: 'ai.features.enabled',
      enabled: true,
      description: 'Enable AI-powered features (meaning, TTS, hints)',
    },
    'batch.card.creation': {
      key: 'batch.card.creation',
      enabled: true,
      description: 'Enable batch card creation',
    },
    'listening.exercises': {
      key: 'listening.exercises',
      enabled: true,
      description: 'Enable listening exercises',
    },
    'study.session.tracking': {
      key: 'study.session.tracking',
      enabled: true,
      description: 'Enable study session tracking',
    },
  };

  constructor(
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(FeatureService.name);
  }

  async isEnabled(key: string): Promise<boolean> {
    const flag = await this.getFlag(key);
    return flag?.enabled ?? false;
  }

  async getFlag(key: string): Promise<FeatureFlag | null> {
    // Check cache first
    const cached = await this.cacheManager.get<FeatureFlag>(
      `${this.FEATURE_PREFIX}${key}`,
    );
    if (cached) return cached;

    // Fall back to defaults
    const defaultFlag = this.defaultFlags[key];
    if (defaultFlag) {
      // Cache the default
      await this.cacheManager.set(
        `${this.FEATURE_PREFIX}${key}`,
        defaultFlag,
        this.DEFAULT_TTL,
      );
      return defaultFlag;
    }

    return null;
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    const flags: FeatureFlag[] = [];
    for (const key of Object.keys(this.defaultFlags)) {
      const flag = await this.getFlag(key);
      if (flag) flags.push(flag);
    }
    return flags;
  }

  async setFlag(
    key: string,
    enabled: boolean,
    description?: string,
    rules?: Record<string, unknown>,
  ): Promise<FeatureFlag> {
    const flag: FeatureFlag = {
      key,
      enabled,
      description: description || this.defaultFlags[key]?.description,
      rules,
    };

    await this.cacheManager.set(
      `${this.FEATURE_PREFIX}${key}`,
      flag,
      this.DEFAULT_TTL,
    );

    this.logger.log(`Feature flag "${key}" set to ${enabled}`);
    return flag;
  }

  async deleteFlag(key: string): Promise<void> {
    await this.cacheManager.del(`${this.FEATURE_PREFIX}${key}`);
    this.logger.log(`Feature flag "${key}" deleted`);
  }

  async requireEnabled(key: string): Promise<void> {
    const enabled = await this.isEnabled(key);
    if (!enabled) {
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.FEATURE_FLAG_NOT_FOUND,
        `Feature "${key}" is not enabled`,
      );
    }
  }
}
