// src/modules/pusher-auth/pusher-auth.service.ts
import { Injectable, HttpStatus } from '@nestjs/common';
import { PusherService } from '@infrastructure/pusher/pusher.service';
import { PrismaService } from '@database/prisma.service';
import { LoggerService } from '@common/logger/logger.service';
import { BusinessException } from '@common/filters/business.exception';
import { ERROR_CODES } from '@common/constants/error-codes.const';
import {
  PusherAuthDto,
  PusherAuthResponseDto,
} from '@modules/pusher-auth/dto/pusher-auth.dto';
import { RequestUser } from '@common/interfaces/request-user.interface';

@Injectable()
export class PusherAuthService {
  constructor(
    private readonly pusherService: PusherService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PusherAuthService.name);
  }

  async authenticate(
    user: RequestUser,
    dto: PusherAuthDto,
  ): Promise<PusherAuthResponseDto> {
    const { socket_id, channel_name } = dto;

    // Check channel permissions
    if (channel_name.startsWith('private-user-')) {
      const targetUserId = channel_name.replace('private-user-', '');
      if (targetUserId !== user.id) {
        throw new BusinessException(
          HttpStatus.FORBIDDEN,
          ERROR_CODES.PUSHER_CHANNEL_ACCESS_DENIED,
          'You can only subscribe to your own private channel',
        );
      }
    } else if (channel_name.startsWith('private-collab-')) {
      const deckId = channel_name.replace('private-collab-', '');
      const hasAccess = await this.checkDeckAccess(user.id, deckId);
      if (!hasAccess) {
        throw new BusinessException(
          HttpStatus.FORBIDDEN,
          ERROR_CODES.PUSHER_CHANNEL_ACCESS_DENIED,
          'You do not have access to this collaboration channel',
        );
      }
    } else if (channel_name.startsWith('presence-')) {
      // Presence channels require additional validation
      if (user.role !== 'ADMIN') {
        throw new BusinessException(
          HttpStatus.FORBIDDEN,
          ERROR_CODES.PUSHER_CHANNEL_ACCESS_DENIED,
          'Only admins can subscribe to presence channels',
        );
      }
    } else {
      // Only allow private and presence channels
      throw new BusinessException(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.PUSHER_CHANNEL_ACCESS_DENIED,
        'Only private and presence channels are supported',
      );
    }

    try {
      // Authenticate with Pusher
      const authResult = this.pusherService.authenticate(
        socket_id,
        channel_name,
        {
          user_id: user.id,
          user_info: { role: user.role },
        },
      );
      return {
        auth: authResult.auth,
        channel_data: authResult.channel_data,
      };
    } catch (error) {
      this.logger.error(
        `Pusher auth failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ERROR_CODES.PUSHER_AUTH_FAILED,
        'Failed to authenticate with Pusher',
      );
    }
  }

  private async checkDeckAccess(
    userId: string,
    deckId: string,
  ): Promise<boolean> {
    try {
      const deck = await this.prisma.deck.findUnique({ where: { id: deckId } });
      if (!deck) return false;
      // User is owner or deck is public
      return deck.userId === userId;
    } catch {
      return false;
    }
  }
}
