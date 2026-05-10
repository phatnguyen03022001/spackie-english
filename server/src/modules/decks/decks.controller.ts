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
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DecksService } from '@modules/decks/decks.service';
import { UpdateCoverUseCase } from '@modules/decks/use-cases/update-cover.use-case';
import { CreateDeckDto } from '@modules/decks/dto/create-deck.dto';
import { UpdateDeckDto } from '@modules/decks/dto/update-deck.dto';
import { DeckListQueryDto } from '@modules/decks/dto/deck-list-query.dto';
import { DeckResponseDto } from '@modules/decks/dto/deck-response.dto';
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
  @CacheTTL(CACHE_TTL.LIST)
  async findPublicDecks(
    @Query() query: DeckListQueryDto,
  ): Promise<PaginationResponseDto<DeckResponseDto>> {
    const { data, total } = await this.decksService.findPublicDecks(query);
    return new PaginationResponseDto(data, total, query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deck detail' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: RequestUser,
  ): Promise<SuccessResponseDto<DeckResponseDto>> {
    const deck = await this.decksService.findById(id, user?.id);
    return new SuccessResponseDto(deck);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update deck' })
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

  @Delete(':id/cover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete deck cover' })
  async deleteCover(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<DeckResponseDto>> {
    const deck = await this.decksService.deleteCover(user.id, id);
    return new SuccessResponseDto(deck, 'Cover deleted');
  }
}
