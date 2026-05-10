// src/modules/listening/listening.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ListeningService } from '@modules/listening/listening.service';
import { StartListeningDto } from '@modules/listening/dto/start-listening.dto';
import { SubmitListeningDto } from '@modules/listening/dto/submit-listening.dto';
import { ListeningResultDto } from '@modules/listening/dto/listening-result.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Listening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('listening')
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a listening exercise' })
  async startExercise(
    @CurrentUser('id') userId: string,
    @Body() dto: StartListeningDto,
  ) {
    return this.listeningService.startExercise(userId, dto);
  }

  @Post(':exerciseId/submit')
  @ApiOperation({ summary: 'Submit a listening exercise' })
  async submitExercise(
    @CurrentUser('id') userId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: SubmitListeningDto,
  ): Promise<ListeningResultDto> {
    return this.listeningService.submitExercise(userId, exerciseId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get listening practice history' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.listeningService.getHistory(userId, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get listening practice stats' })
  async getStats(@CurrentUser('id') userId: string) {
    return this.listeningService.getStats(userId);
  }
}
