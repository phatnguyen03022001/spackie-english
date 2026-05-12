// src/modules/study-session/study-session.controller.ts
import {
  Controller,
  Get,
  Post,
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
import { StudySessionService } from '@modules/study-session/study-session.service';
import { StartSessionDto } from '@modules/study-session/dto/start-session.dto';
import { SessionResponseDto } from '@modules/study-session/dto/session-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto';

@ApiTags('Study Session')
@ApiBearerAuth()
@Controller('study/session')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudySessionController {
  constructor(private readonly studySessionService: StudySessionService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a study session' })
  @ApiResponse({
    status: 201,
    description: 'Session started (or existing active session returned)',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async start(
    @CurrentUser() user: RequestUser,
    @Body() dto: StartSessionDto,
  ): Promise<SessionResponseDto> {
    return this.studySessionService.start(user.id, dto);
  }

  @Post('end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the current study session' })
  @ApiResponse({
    status: 200,
    description: 'Session ended',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No active session found' })
  async end(@CurrentUser() user: RequestUser): Promise<SessionResponseDto> {
    return this.studySessionService.end(user.id);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current active session (if any)' })
  @ApiResponse({
    status: 200,
    description: 'Active session or null',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrent(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<SessionResponseDto | null>> {
    const session = await this.studySessionService.getCurrent(user.id);
    return new SuccessResponseDto(session);
  }
}
