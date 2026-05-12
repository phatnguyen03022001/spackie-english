// src/modules/favorite/favorite.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { FavoriteService } from '@modules/favorite/favorite.service';
import { FavoriteResponseDto } from '@modules/favorite/dto/favorite-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto';
import { PaginationRequestDto } from '@common/dto/pagination-request.dto';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post('decks/:id/favorite')
  @ApiOperation({ summary: 'Add a deck to favorites' })
  @ApiParam({ name: 'id', description: 'Deck ID' })
  @ApiResponse({ status: 201, description: 'Added to favorites' })
  @ApiResponse({ status: 409, description: 'FAVORITE_ALREADY_EXISTS' })
  async add(
    @CurrentUser() user: RequestUser,
    @Param('id') deckId: string,
  ): Promise<SuccessResponseDto<FavoriteResponseDto>> {
    const favorite = await this.favoriteService.add(user.id, deckId);
    return new SuccessResponseDto(favorite, 'Added to favorites');
  }

  @Delete('decks/:id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a deck from favorites' })
  @ApiParam({ name: 'id', description: 'Deck ID' })
  @ApiResponse({ status: 200, description: 'Removed from favorites' })
  @ApiResponse({ status: 404, description: 'FAVORITE_NOT_FOUND' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') deckId: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.favoriteService.remove(user.id, deckId);
    return new SuccessResponseDto(null, 'Removed from favorites');
  }

  @Get('users/me/favorites')
  @ApiOperation({ summary: 'Get user favorite decks (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated favorites' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: PaginationRequestDto,
  ): Promise<{ data: FavoriteResponseDto[]; total: number }> {
    return this.favoriteService.findByUser(user.id, query);
  }
}
