// src/modules/cards/cards-deck.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiExtraModels,
} from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardAutoUseCase } from './use-cases/create-card-auto.use-case';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CreateCardAutoDto } from './dto/create-card-auto.dto';
import { CardListQueryDto } from './dto/card-list-query.dto';
import { CardResponseDto } from './dto/card-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto, PaginationResponseDto } from '@common/dto';
import { CacheTTL } from '@common/decorators/cache-ttl.decorator';
import { CACHE_TTL } from '@common/utils/cache.util';
import { Throttle } from '@nestjs/throttler';
import { IdempotencyInterceptor } from '@common/interceptors/idempotency.interceptor';

@ApiTags('Cards in Deck')
@ApiBearerAuth()
@ApiExtraModels(PaginationResponseDto)
@Controller('decks/:deckId/cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardsDeckController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly createCardAutoUseCase: CreateCardAutoUseCase,
  ) {}

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiHeader({
    name: 'Idempotency-Key',
    description:
      'Unique key to prevent duplicate card creation (UUID v4 recommended)',
    required: false,
  })
  @ApiOperation({ summary: 'Create a new card (manual) in a deck' })
  @ApiResponse({
    status: 201,
    description: 'Card created',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_FAILED or INVALID_WORD',
  })
  @ApiResponse({ status: 409, description: 'CARD_ALREADY_IN_DECK' })
  async createManual(
    @CurrentUser() user: RequestUser,
    @Param('deckId') deckId: string,
    @Body() dto: CreateCardDto,
    @Headers('Idempotency-Key') _idempotencyKey?: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.createCardManual(user.id, deckId, dto);
    return new SuccessResponseDto(card, 'Card created');
  }

  @Post('auto')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Auto-create card with enrichment (Global Vocabulary)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Required idempotency key to prevent duplicate card creation',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Card auto-created with enrichment',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED' })
  @ApiResponse({ status: 409, description: 'CARD_ALREADY_IN_DECK' })
  async createAuto(
    @CurrentUser() user: RequestUser,
    @Param('deckId') deckId: string,
    @Body() dto: CreateCardAutoDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.createCardAutoUseCase.execute(
      user.id,
      deckId,
      dto.front,
      idempotencyKey,
    );
    return new SuccessResponseDto(card, 'Card auto-created');
  }

  @Get()
  @CacheTTL(CACHE_TTL.LIST)
  @ApiOperation({ summary: 'List cards in a deck' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of cards',
    type: PaginationResponseDto<CardResponseDto>,
  })
  @ApiResponse({ status: 403, description: 'DECK_PRIVATE' })
  @ApiResponse({ status: 404, description: 'DECK_NOT_FOUND' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Param('deckId') deckId: string,
    @Query() query: CardListQueryDto,
  ): Promise<PaginationResponseDto<CardResponseDto>> {
    const { data, total } = await this.cardsService.findCardsByDeck(
      user.id,
      deckId,
      query,
    );
    return new PaginationResponseDto(data, total, query.page, query.limit);
  }

  @Get(':cardId')
  @ApiOperation({ summary: 'Get GlobalCard detail (within deck context)' })
  @ApiResponse({
    status: 200,
    description: 'Card detail',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({ status: 404, description: 'CARD_NOT_FOUND' })
  async findOne(
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.findGlobalCardById(cardId);
    return new SuccessResponseDto(card);
  }

  @Patch(':cardId')
  @ApiOperation({ summary: 'Update GlobalCard front/back' })
  @ApiResponse({
    status: 200,
    description: 'Card updated',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED' })
  @ApiResponse({ status: 404, description: 'CARD_NOT_FOUND' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.updateGlobalCard(user.id, cardId, dto);
    return new SuccessResponseDto(card, 'Card updated');
  }

  @Delete(':cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a card from a deck (delete mapping)' })
  @ApiResponse({ status: 200, description: 'Card removed from deck' })
  @ApiResponse({ status: 403, description: 'DECK_NOT_OWNED' })
  @ApiResponse({ status: 404, description: 'CARD_NOT_FOUND' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('deckId') deckId: string,
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.cardsService.deleteCardFromDeck(user.id, deckId, cardId);
    return new SuccessResponseDto(null, 'Card removed from deck');
  }
}
