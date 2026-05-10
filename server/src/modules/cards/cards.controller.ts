// src/modules/cards/cards.controller.ts
import {
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
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

@ApiTags('Cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly createCardAutoUseCase: CreateCardAutoUseCase,
  ) {}

  // ==================== Routes dưới /decks/:deckId/cards ====================

  @Post('decks/:deckId/cards')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new card (manual) in a deck' })
  async createManual(
    @CurrentUser() user: RequestUser,
    @Param('deckId') deckId: string,
    @Body() dto: CreateCardDto,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.createCardManual(user.id, deckId, dto);
    return new SuccessResponseDto(card, 'Card created');
  }

  @Post('decks/:deckId/cards/auto')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Auto-create card with enrichment (Global Vocabulary)',
  })
  async createAuto(
    @CurrentUser() user: RequestUser,
    @Param('deckId') deckId: string,
    @Body() dto: CreateCardAutoDto,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.createCardAutoUseCase.execute(
      user.id,
      deckId,
      dto.front,
    );
    return new SuccessResponseDto(card, 'Card auto-created');
  }

  @Get('decks/:deckId/cards')
  @CacheTTL(CACHE_TTL.LIST)
  @ApiOperation({ summary: 'List cards in a deck' })
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

  @Get('decks/:deckId/cards/:cardId')
  @ApiOperation({ summary: 'Get GlobalCard detail' })
  async findOne(
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.findGlobalCardById(cardId);
    return new SuccessResponseDto(card);
  }

  @Patch('decks/:deckId/cards/:cardId')
  @ApiOperation({ summary: 'Update GlobalCard front/back' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.updateGlobalCard(user.id, cardId, dto);
    return new SuccessResponseDto(card, 'Card updated');
  }

  @Delete('decks/:deckId/cards/:cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a card from a deck (delete mapping)' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('deckId') deckId: string,
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.cardsService.deleteCardFromDeck(user.id, deckId, cardId);
    return new SuccessResponseDto(null, 'Card removed from deck');
  }

  // ==================== Routes dưới /cards (GlobalCard) ====================

  @Get('cards/:cardId')
  @ApiOperation({ summary: 'Get GlobalCard detail (standalone)' })
  async findGlobalCard(
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.findGlobalCardById(cardId);
    return new SuccessResponseDto(card);
  }

  @Patch('cards/:cardId')
  @ApiOperation({ summary: 'Update GlobalCard (standalone)' })
  async updateGlobalCard(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.updateGlobalCard(user.id, cardId, dto);
    return new SuccessResponseDto(card, 'Card updated');
  }

  // ==================== Media routes ====================

  @Post('cards/:cardId/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload image for a GlobalCard' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async uploadImage(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.uploadImage(
      user.id,
      cardId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    return new SuccessResponseDto(card, 'Image uploaded');
  }

  @Delete('cards/:cardId/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete image from a GlobalCard' })
  async deleteImage(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.deleteImage(user.id, cardId);
    return new SuccessResponseDto(card, 'Image deleted');
  }

  @Post('cards/:cardId/audio')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload audio for a GlobalCard' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async uploadAudio(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(mp3|wav|ogg|m4a)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.uploadAudio(
      user.id,
      cardId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    return new SuccessResponseDto(card, 'Audio uploaded');
  }

  @Delete('cards/:cardId/audio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete audio from a GlobalCard' })
  async deleteAudio(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.deleteAudio(user.id, cardId);
    return new SuccessResponseDto(card, 'Audio deleted');
  }

  // ==================== AI Hint ====================

  @Post('cards/:cardId/ai-hint')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate AI hint for a GlobalCard' })
  async generateAiHint(
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<{ hint: string }>> {
    const result = await this.cardsService.generateAiHint(cardId);
    return new SuccessResponseDto(result, 'AI hint generated');
  }
}
