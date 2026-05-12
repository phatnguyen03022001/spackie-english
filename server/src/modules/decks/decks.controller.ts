// src/modules/decks/decks.controller.ts
import {
  Controller,
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
  ParseFilePipeBuilder,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
  ApiParam,
  ApiExtraModels,
  ApiSecurity,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DecksService } from '@modules/decks/decks.service';
import { UpdateCoverUseCase } from '@modules/decks/use-cases/update-cover.use-case';
import { CreateDeckDto } from '@modules/decks/dto/create-deck.dto';
import { UpdateDeckDto } from '@modules/decks/dto/update-deck.dto';
import { DeckListQueryDto } from '@modules/decks/dto/deck-list-query.dto';
import { DeckResponseDto } from '@modules/decks/dto/deck-response.dto';
import { ReorderCardsDto } from '@modules/decks/dto/reorder-cards.dto';
import { CloneDeckDto } from '@modules/decks/dto/clone-deck.dto';
import { ExportedDeckDto } from '@modules/decks/dto/export-deck.dto';
import { ImportDeckDto } from '@modules/decks/dto/import-deck.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { Public } from '@common/decorators/public.decorator';
import { SuccessResponseDto } from '@common/dto/success-response.dto';
import { PaginationResponseDto } from '@common/dto/pagination-response.dto';
import { CacheTTL } from '@common/decorators/cache-ttl.decorator';
import { CACHE_TTL } from '@common/utils/cache.util';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Decks')
@ApiBearerAuth()
@ApiExtraModels(PaginationResponseDto)
@Controller('decks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DecksController {
  constructor(
    private readonly decksService: DecksService,
    private readonly updateCoverUseCase: UpdateCoverUseCase,
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new deck' })
  @ApiResponse({
    status: 201,
    description: 'Deck created',
    type: SuccessResponseDto<DeckResponseDto>,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDeckDto,
  ): Promise<SuccessResponseDto<DeckResponseDto>> {
    const deck = await this.decksService.create(user.id, dto);
    return new SuccessResponseDto(deck, 'Deck created');
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my decks' })
  @CacheTTL(CACHE_TTL.LIST)
  @ApiResponse({
    status: 200,
    description: 'Paginated list of user decks',
    type: PaginationResponseDto<DeckResponseDto>,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyDecks(
    @CurrentUser() user: RequestUser,
    @Query() query: DeckListQueryDto,
  ): Promise<PaginationResponseDto<DeckResponseDto>> {
    const { data, total } = await this.decksService.findOwnDecks(
      user.id,
      query,
    );
    return new PaginationResponseDto(data, total, query.page, query.limit);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public deck catalog' })
  @ApiSecurity({})
  @CacheTTL(CACHE_TTL.LIST)
  @ApiResponse({
    status: 200,
    description: 'Paginated list of public decks',
    type: PaginationResponseDto<DeckResponseDto>,
  })
  async findPublicDecks(
    @Query() query: DeckListQueryDto,
  ): Promise<PaginationResponseDto<DeckResponseDto>> {
    const { data, total } = await this.decksService.findPublicDecks(query);
    return new PaginationResponseDto(data, total, query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deck detail' })
  @ApiParam({ name: 'id', description: 'Deck ID' })
  @ApiResponse({
    status: 200,
    description: 'Deck detail',
    type: SuccessResponseDto<DeckResponseDto>,
  })
  @ApiResponse({ status: 404, description: 'DECK_NOT_FOUND' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: RequestUser,
  ): Promise<SuccessResponseDto<DeckResponseDto>> {
    const deck = await this.decksService.findById(id, user?.id);
    return new SuccessResponseDto(deck);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update deck' })
  @ApiParam({ name: 'id', description: 'Deck ID' })
  @ApiResponse({
    status: 200,
    description: 'Deck updated',
    type: SuccessResponseDto<DeckResponseDto>,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED' })
  @ApiResponse({ status: 404, description: 'DECK_NOT_FOUND' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateDeckDto,
  ): Promise<SuccessResponseDto<DeckResponseDto>> {
    const deck = await this.decksService.update(user.id, id, dto);
    return new SuccessResponseDto(deck, 'Deck updated');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete deck' })
  @ApiParam({ name: 'id', description: 'Deck ID' })
  @ApiResponse({ status: 200, description: 'Deck soft-deleted' })
  @ApiResponse({ status: 404, description: 'DECK_NOT_FOUND' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.decksService.delete(user.id, id);
    return new SuccessResponseDto(null, 'Deck deleted');
  }

  @Post(':id/cover')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload deck cover image' })
  @ApiParam({ name: 'id', description: 'Deck ID' })
  @ApiResponse({
    status: 201,
    description: 'Cover uploaded',
    type: SuccessResponseDto<DeckResponseDto>,
  })
  @ApiResponse({
    status: 422,
    description: 'UNPROCESSABLE_ENTITY - invalid file type or size',
  })
  async uploadCover(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ): Promise<SuccessResponseDto<DeckResponseDto>> {
    const deck = await this.updateCoverUseCase.execute(
      user.id,
      id,
      file.buffer,
      file.originalname,
    );
    return new SuccessResponseDto(deck, 'Cover updated');
  }

  @Patch(':id/cards/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder cards in a deck' })
  @ApiParam({ name: 'id', description: 'Deck ID' })
  @ApiResponse({
    status: 200,
    description: 'Cards reordered successfully',
  })
  @ApiResponse({ status: 403, description: 'DECK_NOT_OWNED' })
  @ApiResponse({ status: 404, description: 'DECK_NOT_FOUND' })
  async reorderCards(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReorderCardsDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.decksService.reorderCards(user.id, id, dto);
    return new SuccessResponseDto(null, 'Cards reordered successfully');
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone a deck' })
  @ApiParam({ name: 'id', description: 'Source deck ID' })
  @ApiResponse({
    status: 201,
    description: 'Deck cloned',
    type: SuccessResponseDto<DeckResponseDto>,
  })
  @ApiResponse({ status: 404, description: 'DECK_NOT_FOUND' })
  async cloneDeck(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CloneDeckDto,
  ): Promise<SuccessResponseDto<DeckResponseDto>> {
    const deck = await this.decksService.cloneDeck(user.id, id, dto);
    return new SuccessResponseDto(deck, 'Deck cloned successfully');
  }

  @Delete(':id/cover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete deck cover' })
  @ApiParam({ name: 'id', description: 'Deck ID' })
  @ApiResponse({
    status: 200,
    description: 'Cover deleted',
    type: SuccessResponseDto<DeckResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'DECK_NOT_FOUND or COVER_NOT_FOUND',
  })
  async deleteCover(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<DeckResponseDto>> {
    const deck = await this.decksService.deleteCover(user.id, id);
    return new SuccessResponseDto(deck, 'Cover deleted');
  }

  // ------------------- Export deck -------------------
  @Get(':id/export')
  @ApiOperation({ summary: 'Export deck as JSON' })
  @ApiParam({ name: 'id', description: 'Deck ID' })
  @ApiResponse({
    status: 200,
    description: 'Exported deck data',
    type: SuccessResponseDto<ExportedDeckDto>,
  })
  @ApiResponse({ status: 403, description: 'DECK_PRIVATE' })
  @ApiResponse({ status: 404, description: 'DECK_NOT_FOUND' })
  async exportDeck(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<ExportedDeckDto>> {
    const data = await this.decksService.exportDeck(user.id, id);
    return new SuccessResponseDto(data, 'Deck exported successfully');
  }

  // ------------------- Import deck -------------------
  @Post('import')
  @ApiOperation({ summary: 'Import deck from JSON' })
  @ApiResponse({
    status: 201,
    description: 'Deck imported',
    type: SuccessResponseDto<DeckResponseDto>,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED' })
  async importDeck(
    @CurrentUser() user: RequestUser,
    @Body() dto: ImportDeckDto,
  ): Promise<SuccessResponseDto<DeckResponseDto>> {
    const deck = await this.decksService.importDeck(user.id, dto);
    return new SuccessResponseDto(deck, 'Deck imported successfully');
  }

  // ------------------- Popular tags -------------------
  @Public()
  @Get('tags/popular')
  @ApiOperation({ summary: 'Get popular deck tags' })
  @ApiSecurity({})
  @CacheTTL(CACHE_TTL.MEDIUM)
  @ApiResponse({
    status: 200,
    description: 'List of popular tags',
    type: SuccessResponseDto<string[]>,
  })
  async getPopularTags(
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<string[]>> {
    const tags = await this.decksService.getPopularTags(
      limit ? parseInt(limit, 10) : 20,
    );
    return new SuccessResponseDto(tags, 'Popular tags retrieved');
  }
}
