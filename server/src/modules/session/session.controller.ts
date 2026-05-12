// src/modules/session/session.controller.ts
import {
  Controller,
  Get,
  Delete,
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
import { SessionService } from '@modules/session/session.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { SessionResponseDto } from '@modules/session/dto/session-response.dto';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions',
    type: SuccessResponseDto<SessionResponseDto>,
  })
  async getSessions(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<SessionResponseDto[]>> {
    const deviceId = user.iat?.toString() || '';
    const sessions = await this.sessionService.getSessions(user.id, deviceId);
    return new SuccessResponseDto(sessions, 'Sessions fetched');
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to revoke' })
  @ApiResponse({ status: 204, description: 'Session revoked' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(
    @CurrentUser() user: RequestUser,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.sessionService.revokeSession(user.id, sessionId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  @ApiResponse({ status: 204, description: 'All other sessions revoked' })
  async revokeAllSessions(@CurrentUser() user: RequestUser): Promise<void> {
    const deviceId = user.iat?.toString() || '';
    await this.sessionService.revokeAllSessionsExceptCurrent(user.id, deviceId);
  }
}
