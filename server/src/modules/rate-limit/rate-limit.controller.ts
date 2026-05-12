// src/modules/rate-limit/rate-limit.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RateLimitService } from '@modules/rate-limit/rate-limit.service';
import { RateLimitInfoDto } from '@modules/rate-limit/dto/rate-limit-info.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto/success-response.dto';

@ApiTags('Rate Limit')
@ApiBearerAuth()
@Controller('rate-limit')
@UseGuards(JwtAuthGuard)
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user rate limit information' })
  @ApiResponse({
    status: 200,
    description: 'Rate limit info returned',
    type: SuccessResponseDto<RateLimitInfoDto>,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRateLimitInfo(
    @CurrentUser() user: RequestUser,
  ): Promise<SuccessResponseDto<RateLimitInfoDto>> {
    const info = await this.rateLimitService.getRateLimitInfo(user.id);
    return new SuccessResponseDto(info, 'Rate limit info fetched');
  }
}
