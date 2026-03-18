// src/modules/vocab/controllers/management.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ManagementService } from '../services/management.service';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateCardDto, CreateDeckDto } from '../dto/vocab.dto';

@Controller('management/vocab')
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Post('decks')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async createMasterDeck(
    @Body() dto: CreateDeckDto,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.managementService.createDeck(teacherId, dto);
  }

  @Post('decks/:id/cards/auto-bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async bulkImportCardsAuto(
    @Param('id') deckId: string,
    @Body('words') words: string[],
  ) {
    return this.managementService.bulkCreateCardsWithAutoFill(deckId, words);
  }

  @Patch('decks/:id/status')
  @Roles(UserRole.ADMIN)
  async moderateDeck(
    @Param('id') id: string,
    @Body('isPublic') isPublic: boolean,
  ): Promise<{ id: string; isPublic: boolean }> {
    // ← explicit return type (or use your DTO)
    await this.managementService.updateDeckStatus(id, isPublic); // ← add await here

    // Optional: return something meaningful for the client
    return { id, isPublic };
  }

  @Delete('decks/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async deleteDeck(@Param('id') id: string) {
    return this.managementService.softDeleteDeck(id);
  }

  @Get('decks')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getMyDecks(@CurrentUser('id') teacherId: string) {
    return this.managementService.findTeacherDecks(teacherId);
  }

  @Patch('cards/:cardId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async updateCard(
    @Param('cardId') cardId: string,
    @Body() dto: CreateCardDto, // Tái sử dụng CreateCardDto hoặc tạo UpdateCardDto
  ) {
    return this.managementService.updateCard(cardId, dto);
  }

  @Get('decks/:id/preview')
  async getDeckPreview(@Param('id') deckId: string) {
    // Xem trước nội dung bộ thẻ trước khi Enroll
    return this.managementService.getDeckWithCards(deckId);
  }

  @Delete('cards/:cardId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteCard(@Param('cardId') cardId: string) {
    return this.managementService.deleteCard(cardId);
  }
}
