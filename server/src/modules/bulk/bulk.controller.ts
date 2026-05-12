// src/modules/bulk/bulk.controller.ts
import { Controller, Post, Body, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { BulkService } from '@modules/bulk/bulk.service';
import { BulkDeleteCardsDto } from '@modules/bulk/dto/bulk-delete.dto';
import { BulkMoveCardsDto } from '@modules/bulk/dto/bulk-move.dto';
import { BulkUpdateCardsDto } from '@modules/bulk/dto/bulk-update.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto';

@ApiTags('Bulk Operations')
@ApiBearerAuth()
@Controller('cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulkController {
  constructor(private readonly bulkService: BulkService) {}

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete or unlink cards' })
  @ApiResponse({ status: 200, description: 'Cards deleted/unlinked' })
  async bulkDelete(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkDeleteCardsDto,
  ): Promise<SuccessResponseDto<{ deletedCount: number }>> {
    const result = await this.bulkService.bulkDeleteCards(
      user.id,
      dto.cardIds,
      dto.deckId,
    );
    return new SuccessResponseDto(
      result,
      `${result.deletedCount} cards processed`,
    );
  }

  @Post('bulk-move')
  @ApiOperation({ summary: 'Bulk move cards between decks' })
  @ApiResponse({ status: 200, description: 'Cards moved' })
  async bulkMove(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkMoveCardsDto,
  ): Promise<SuccessResponseDto<{ movedCount: number }>> {
    const result = await this.bulkService.bulkMoveCards(
      user.id,
      dto.cardIds,
      dto.sourceDeckId,
      dto.targetDeckId,
    );
    return new SuccessResponseDto(result, `${result.movedCount} cards moved`);
  }

  @Patch('bulk-update')
  @ApiOperation({ summary: 'Bulk update card fields' })
  @ApiResponse({ status: 200, description: 'Cards updated' })
  async bulkUpdate(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkUpdateCardsDto,
  ): Promise<SuccessResponseDto<{ updatedCount: number }>> {
    const result = await this.bulkService.bulkUpdateCards(
      user.id,
      dto.cardIds,
      {
        front: dto.front,
        back: dto.back,
        imageUrl: dto.imageUrl,
        audioUrl: dto.audioUrl,
        extras: dto.extras,
      },
    );
    return new SuccessResponseDto(
      result,
      `${result.updatedCount} cards updated`,
    );
  }
}
