// src/modules/cards/cards-batch.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateCardBatchUseCase } from './use-cases/create-card-batch.use-case';
import { CreateCardBatchDto } from './dto/create-card-batch.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto';
import { Throttle } from '@nestjs/throttler';
import { ICacheManager } from '@common/interfaces/cache-manager.interface';
import { BatchJobResult } from '@common/interfaces/job.interface';

@ApiTags('Cards Batch')
@ApiBearerAuth()
@Controller('decks/:deckId/cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardsBatchController {
  constructor(
    private readonly createCardBatchUseCase: CreateCardBatchUseCase,
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  @Post('batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Batch create cards with async enrichment' })
  async createBatch(
    @CurrentUser() user: RequestUser,
    @Param('deckId') deckId: string,
    @Body() dto: CreateCardBatchDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ): Promise<
    SuccessResponseDto<{
      batchId: string;
      jobIds: string[];
      statusUrl: string;
      message: string;
    }>
  > {
    if (idempotencyKey && !dto.idempotencyKey) {
      dto.idempotencyKey = idempotencyKey;
    }

    const result = await this.createCardBatchUseCase.execute(
      user.id,
      deckId,
      dto,
    );

    return new SuccessResponseDto(
      {
        batchId: result.batchId,
        jobIds: result.jobIds,
        statusUrl: `/api/v1/jobs/batch/${result.batchId}`,
        message:
          result.jobIds.length > 0
            ? 'Batch processing started. Use statusUrl to check progress.'
            : 'All cards already exist in this deck.',
      },
      'Batch processing started',
    );
  }
}

@ApiTags('Job Status')
@ApiBearerAuth()
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobStatusController {
  constructor(
    @Inject('ICacheManager') private readonly cacheManager: ICacheManager,
  ) {}

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get batch enrichment status' })
  async getBatchStatus(
    @Param('batchId') batchId: string,
  ): Promise<SuccessResponseDto<BatchJobResult | null>> {
    const result = await this.cacheManager.get<BatchJobResult>(
      `batch:${batchId}`,
    );
    return new SuccessResponseDto(result ?? null);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get individual job status' })
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<SuccessResponseDto<unknown>> {
    const result = await this.cacheManager.get(`job:${jobId}`);
    return new SuccessResponseDto(result ?? null);
  }
}
