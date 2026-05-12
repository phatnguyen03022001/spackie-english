// src/modules/listening/listening.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { ListeningService } from '@modules/listening/listening.service';
import { StartListeningDto } from '@modules/listening/dto/start-listening.dto';
import { SubmitListeningDto } from '@modules/listening/dto/submit-listening.dto';
import { ListeningResultDto } from '@modules/listening/dto/listening-result.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '@common/interceptors/idempotency.interceptor';

@ApiTags('Listening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('listening')
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a listening exercise' })
  @ApiResponse({ status: 201, description: 'Exercise started' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async startExercise(
    @CurrentUser('id') userId: string,
    @Body() dto: StartListeningDto,
  ) {
    return this.listeningService.startExercise(userId, dto);
  }

  @Post(':exerciseId/submit')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Submit a listening exercise' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique idempotency key to prevent duplicate submissions',
    required: true,
  })
  @ApiParam({ name: 'exerciseId', description: 'Listening exercise ID' })
  @ApiResponse({
    status: 200,
    description: 'Exercise submitted',
    type: ListeningResultDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'EXERCISE_NOT_FOUND' })
  async submitExercise(
    @CurrentUser('id') userId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: SubmitListeningDto,
    @Headers('Idempotency-Key') _idempotencyKey?: string,
  ): Promise<ListeningResultDto> {
    return this.listeningService.submitExercise(userId, exerciseId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get listening practice history' })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    example: 1,
    minimum: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @ApiResponse({ status: 200, description: 'Paginated listening history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.listeningService.getHistory(userId, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get listening practice stats' })
  @ApiResponse({ status: 200, description: 'Listening statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(@CurrentUser('id') userId: string) {
    return this.listeningService.getStats(userId);
  }

  @Get('stats/:cardId')
  @ApiOperation({ summary: 'Get listening statistics for a specific card' })
  @ApiParam({ name: 'cardId', description: 'Global card ID' })
  @ApiResponse({ status: 200, description: 'Card listening stats' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'CARD_NOT_FOUND' })
  async getCardStats(
    @CurrentUser('id') userId: string,
    @Param('cardId') cardId: string,
  ): Promise<{ attempts: number; averageScore: number; bestScore: number }> {
    return this.listeningService.getCardStats(userId, cardId);
  }
}
