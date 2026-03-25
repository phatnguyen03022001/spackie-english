// src/modules/vocab/controllers/management.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseBoolPipe,
} from '@nestjs/common';
import { ManagementService } from '../services/management.service';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  BulkCreateCardsDto,
  CreateCardDto,
  CreateDeckDto,
  UpdateCardDto,
  UpdateDeckDto,
} from '../dto/vocab.dto';
import { AnalyticsService } from '../services/analytics.service';

@Controller('management/vocab')
@Roles(UserRole.TEACHER, UserRole.ADMIN) // Default roles cho toàn bộ controller
export class ManagementController {
  constructor(
    private readonly managementService: ManagementService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post('decks')
  async createMasterDeck(
    @Body() dto: CreateDeckDto,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.managementService.createDeck(teacherId, dto);
  }

  @Get('decks')
  async getMyDecks(@CurrentUser('id') teacherId: string) {
    // Trả về danh sách bộ thẻ do Teacher/Admin này tạo ra
    return this.managementService.findTeacherDecks(teacherId);
  }

  @Get('decks/:id')
  async getDeckDetail(@Param('id') id: string) {
    return this.managementService.getDeckWithCards(id);
  }

  @Patch('decks/:id')
  async updateDeckInfo(
    @Param('id') id: string,
    @Body() dto: UpdateDeckDto,
    @CurrentUser('id') userId: string,
  ) {
    // Service nên kiểm tra quyền sở hữu (ownership) trước khi update
    return this.managementService.updateDeckMetadata(id, dto, userId);
  }

  @Delete('decks/:id')
  async deleteDeck(@Param('id') id: string, @CurrentUser('id') userId: string) {
    // Thực hiện soft delete hoặc xóa master deck
    return this.managementService.deleteMasterDeck(id, userId);
  }

  @Patch('decks/:id/status')
  @Roles(UserRole.ADMIN)
  async moderateDeckStatus(
    @Param('id') id: string,
    @Body('isPublic', ParseBoolPipe) isPublic: boolean,
  ) {
    // Chỉ Admin mới có thể duyệt một bộ thẻ để đưa lên Public Discovery
    return this.managementService.updateDeckStatus(id, isPublic);
  }

  @Post('decks/:id/cards')
  async addCardToDeck(
    @Param('id') deckId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.managementService.createCardManually(deckId, dto, userId);
  }

  @Post('decks/:id/cards/auto-bulk')
  async bulkImportCardsAuto(
    @Param('id') deckId: string,
    @Body() dto: BulkCreateCardsDto,
    @CurrentUser('id') userId: string,
  ) {
    // Sử dụng logic dịch tự động và fetch data từ Dictionary API
    return this.managementService.bulkCreateCardsWithAutoFill(
      deckId,
      dto.words,
      userId,
    );
  }

  @Patch('cards/:cardId')
  async updateCard(
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.managementService.updateCard(cardId, dto, userId);
  }

  @Delete('cards/:cardId')
  async deleteCard(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.managementService.deleteCard(cardId, userId);
  }

  @Get('decks/:id/analytics')
  async getDeckLearningAnalytics(
    @Param('id') deckId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.analyticsService.getDeckLearningAnalytics(deckId, userId);
  }
}
