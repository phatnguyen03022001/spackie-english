// src/modules/ai/ai.controller.ts
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
  ApiBody,
} from '@nestjs/swagger';
import { AiService } from '@modules/ai/ai.service';
import {
  AiUsageResponseDto,
  QuotaResponseDto,
} from '@modules/ai/dto/ai-usage-response.dto';
import { UpdateQuotaDto } from '@modules/ai/dto/update-quota.dto';
import {
  AiExplainRequestDto,
  AiExplainResponseDto,
} from '@modules/ai/dto/ai-explain.dto';
import {
  AiExamplesRequestDto,
  AiExamplesResponseDto,
} from '@modules/ai/dto/ai-examples.dto';
import {
  AiTranslateRequestDto,
  AiTranslateResponseDto,
} from '@modules/ai/dto/ai-translate.dto';
import {
  AiPronunciationFeedbackRequestDto,
  AiPronunciationFeedbackResponseDto,
} from '@modules/ai/dto/ai-pronunciation.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('ai/usage')
  @ApiOperation({ summary: 'Get user AI usage stats' })
  @ApiResponse({
    status: 200,
    description: 'AI usage statistics',
    type: AiUsageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsage(
    @CurrentUser() user: RequestUser,
  ): Promise<AiUsageResponseDto> {
    return this.aiService.getUsage(user.id);
  }

  @Get('ai/quota')
  @ApiOperation({ summary: 'Get remaining AI quota for current period' })
  @ApiResponse({
    status: 200,
    description: 'Quota information',
    type: QuotaResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getQuota(@CurrentUser() user: RequestUser): Promise<QuotaResponseDto> {
    return this.aiService.getQuota(user.id);
  }

  @Get('admin/ai/usage')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get aggregate AI usage across all users (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Admin aggregate usage stats',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN)' })
  async getAdminUsage(): Promise<SuccessResponseDto<unknown>> {
    const usage = await this.aiService.getAdminUsage();
    return new SuccessResponseDto(usage);
  }

  @Post('admin/ai/quota')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user quota limit (admin)' })
  @ApiResponse({
    status: 201,
    description: 'Quota updated',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN)' })
  async updateQuota(
    @Body() dto: UpdateQuotaDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.aiService.updateQuota(dto.userId, dto.monthlyLimitCents);
    return new SuccessResponseDto(null, 'Quota updated successfully');
  }

  @Post('ai/explain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get detailed explanation of a word' })
  @ApiBody({ type: AiExplainRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Word explanation',
    type: AiExplainResponseDto,
  })
  async explainWord(
    @CurrentUser() user: RequestUser,
    @Body() dto: AiExplainRequestDto,
  ): Promise<AiExplainResponseDto> {
    return this.aiService.explainWord(user.id, dto.word);
  }

  @Post('ai/examples')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get example sentences for a word' })
  @ApiBody({ type: AiExamplesRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Example sentences',
    type: AiExamplesResponseDto,
  })
  async getExamples(
    @CurrentUser() user: RequestUser,
    @Body() dto: AiExamplesRequestDto,
  ): Promise<AiExamplesResponseDto> {
    return this.aiService.getExamples(user.id, dto.word, dto.count ?? 5);
  }

  @Post('ai/translate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Translate text using AI' })
  @ApiBody({ type: AiTranslateRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Translation result',
    type: AiTranslateResponseDto,
  })
  async translate(
    @CurrentUser() user: RequestUser,
    @Body() dto: AiTranslateRequestDto,
  ): Promise<AiTranslateResponseDto> {
    return this.aiService.translate(
      user.id,
      dto.text,
      dto.sourceLang,
      dto.targetLang,
    );
  }

  @Post('ai/pronunciation-feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pronunciation feedback for a word or phrase' })
  @ApiBody({ type: AiPronunciationFeedbackRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Pronunciation feedback',
    type: AiPronunciationFeedbackResponseDto,
  })
  async pronunciationFeedback(
    @CurrentUser() user: RequestUser,
    @Body() dto: AiPronunciationFeedbackRequestDto,
  ): Promise<AiPronunciationFeedbackResponseDto> {
    return this.aiService.getPronunciationFeedback(
      user.id,
      dto.text,
      dto.userAudioBase64,
    );
  }
}
