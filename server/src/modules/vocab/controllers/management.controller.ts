import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ManagementService } from '../services/management.service';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  BulkCreateCardsDto,
  CreateWordDto,
  CreateCardWithWordIdDto,
  CreateDeckDto,
  UpdateCardDto,
  UpdateDeckDto,
  DeckResponseDto,
  CardResponseDto,
  BulkImportResultDto,
  DeleteResultDto,
} from '../dto/vocab.dto';
import { AnalyticsService } from '../services/analytics.service';
import { RequestUser } from '@/common/interfaces/request-user.interface';
import { ObjectIdParam } from '@common/decorators/object-id-param.decorator';

@Controller('management/vocab')
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class ManagementController {
  constructor(
    private readonly managementService: ManagementService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post('decks')
  async createMasterDeck(
    @Body() dto: CreateDeckDto,
    @CurrentUser('id') teacherId: string,
  ): Promise<DeckResponseDto> {
    return this.managementService.createDeck(teacherId, dto);
  }

  @Get('decks')
  async getMyDecks(
    @CurrentUser('id') teacherId: string,
  ): Promise<DeckResponseDto[]> {
    return this.managementService.findTeacherDecks(teacherId);
  }

  @Get('decks/:id')
  async getDeckDetail(
    @ObjectIdParam() id: string,
    @CurrentUser('id') userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
  ): Promise<DeckResponseDto | null> {
    return this.managementService.getDeckWithCards(id, userId, limit, page);
  }

  @Patch('decks/:id')
  async updateDeckInfo(
    @ObjectIdParam() id: string,
    @Body() dto: UpdateDeckDto,
    @CurrentUser() user: RequestUser,
  ): Promise<DeckResponseDto> {
    return this.managementService.updateDeckMetadata(id, dto, user);
  }

  @Post('decks/:id/cards')
  async addCardToDeck(
    @ObjectIdParam('id') deckId: string,
    @Body() dto: CreateWordDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CardResponseDto> {
    return this.managementService.createCardManually(deckId, dto, user);
  }

  @Delete('decks/:id')
  async deleteDeck(
    @ObjectIdParam() id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<DeleteResultDto> {
    return this.managementService.deleteMasterDeck(id, user);
  }

  @Patch('decks/:id/status')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async moderateDeckStatus(
    @ObjectIdParam() id: string,
    @Body('isPublic', ParseBoolPipe) isPublic: boolean,
    @CurrentUser() user: RequestUser,
  ): Promise<DeckResponseDto> {
    return this.managementService.updateDeckStatus(id, isPublic, user);
  }

  @Post('decks/:id/cards/from-word')
  async addCardFromWord(
    @ObjectIdParam('id') deckId: string,
    @Body() dto: CreateCardWithWordIdDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CardResponseDto> {
    return this.managementService.createCardFromWord(deckId, dto, user);
  }

  @Post('decks/:id/cards/auto-bulk')
  async bulkImportCardsAuto(
    @ObjectIdParam('id') deckId: string,
    @Body() dto: BulkCreateCardsDto,
    @CurrentUser() user: RequestUser,
  ): Promise<BulkImportResultDto> {
    return this.managementService.bulkCreateCardsWithAutoFill(
      deckId,
      dto.words,
      user,
    );
  }

  @Patch('cards/:cardId')
  async updateCard(
    @ObjectIdParam('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CardResponseDto> {
    return this.managementService.updateCard(cardId, dto, user);
  }

  @Delete('cards/:cardId')
  async deleteCard(
    @ObjectIdParam('cardId') cardId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<DeleteResultDto> {
    await this.managementService.deleteCard(cardId, user);
    return { success: true };
  }

  @Get('decks/:id/analytics')
  async getDeckLearningAnalytics(
    @ObjectIdParam('id') deckId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.managementService.getDeckAnalytics(deckId, userId);
  }
}
