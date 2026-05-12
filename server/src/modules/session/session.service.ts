// src/modules/session/session.service.ts
import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import { SessionResponseDto } from '@modules/session/dto/session-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SessionService {
  private readonly SESSION_PREFIX = 'auth:refresh:';

  constructor(
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  async getSessions(
    userId: string,
    currentDeviceId?: string,
  ): Promise<SessionResponseDto[]> {
    const keys = await this.scanKeys(`${this.SESSION_PREFIX}${userId}:*`);
    const sessions: SessionResponseDto[] = [];

    for (const key of keys) {
      const deviceId = key.split(':').pop() || '';
      const raw = await this.cacheManager.get<Record<string, unknown>>(key);
      const session: SessionResponseDto = plainToInstance(SessionResponseDto, {
        sessionId: deviceId,
        deviceName: raw?.deviceName || undefined,
        ip: raw?.ip || undefined,
        userAgent: raw?.userAgent || undefined,
        createdAt: raw?.createdAt
          ? new Date(raw.createdAt as string)
          : new Date(),
        lastUsedAt: raw?.lastUsedAt
          ? new Date(raw.lastUsedAt as string)
          : new Date(),
        isCurrent: deviceId === currentDeviceId,
      });
      sessions.push(session);
    }

    sessions.sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());

    return sessions;
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${userId}:${sessionId}`;
    const exists = await this.cacheManager.get(key);
    if (!exists) {
      throw new BusinessException(
        HttpStatus.NOT_FOUND,
        ERROR_CODES.SESSION_NOT_FOUND,
        'Session not found',
      );
    }
    await this.cacheManager.del(key);
  }

  async revokeAllSessionsExceptCurrent(
    userId: string,
    currentDeviceId: string,
  ): Promise<void> {
    const keys = await this.scanKeys(`${this.SESSION_PREFIX}${userId}:*`);
    const keysToDelete = keys.filter(
      (key) => !key.endsWith(`:${currentDeviceId}`),
    );
    for (const key of keysToDelete) {
      await this.cacheManager.del(key);
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const baseKey = pattern.replace(/\*$/, '');
    const singleKey = await this.cacheManager.get(baseKey);
    if (singleKey) {
      keys.push(baseKey);
    }
    return keys;
  }
}
