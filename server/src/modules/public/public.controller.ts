// src/modules/public/public.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PublicService } from '@modules/public/public.service';
import { Public } from '@common/decorators/public.decorator';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';
import { PaginationMetaDto } from '@common/dto/pagination-response.dto';

@ApiTags('Public')
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get public user profile' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Public user profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserProfile(
    @Param('userId') userId: string,
  ): Promise<SuccessResponseDto<unknown>> {
    const profile = await this.publicService.getUserProfile(userId);
    return new SuccessResponseDto(profile, 'User profile fetched');
  }

  @Get('users/:userId/decks')
  @ApiOperation({ summary: 'Get public decks of a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserDecks(
    @Param('userId') userId: string,
    @Query() query: PaginationRequestDto,
  ): Promise<SuccessResponseDto<unknown>> {
    const skip = (query.page - 1) * query.limit;
    const result = await this.publicService.getUserPublicDecks(
      userId,
      skip,
      query.limit,
    );
    const meta = new PaginationMetaDto(query.page, query.limit, result.total);
    return new SuccessResponseDto(result.decks, 'Public decks fetched', meta);
  }
}
