// src/modules/cards/cards-global.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { UpdateCardDto } from './dto/update-card.dto';
import { CardResponseDto } from './dto/card-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequestUser } from '@common/interfaces/request-user.interface';
import { SuccessResponseDto } from '@common/dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Global Cards')
@ApiBearerAuth()
@Controller('cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardsGlobalController {
  constructor(private readonly cardsService: CardsService) {}

  @Get(':cardId')
  @ApiOperation({ summary: 'Get GlobalCard detail (standalone)' })
  async findGlobalCard(
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.findGlobalCardById(cardId);
    return new SuccessResponseDto(card);
  }

  @Patch(':cardId')
  @ApiOperation({ summary: 'Update GlobalCard (standalone)' })
  async updateGlobalCard(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.updateGlobalCard(user.id, cardId, dto);
    return new SuccessResponseDto(card, 'Card updated');
  }

  @Post(':cardId/image')
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
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
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

  @Delete(':cardId/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete image from a GlobalCard' })
  async deleteImage(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.deleteImage(user.id, cardId);
    return new SuccessResponseDto(card, 'Image deleted');
  }

  @Post(':cardId/audio')
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
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
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

  @Delete(':cardId/audio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete audio from a GlobalCard' })
  async deleteAudio(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.deleteAudio(user.id, cardId);
    return new SuccessResponseDto(card, 'Audio deleted');
  }

  @Post(':cardId/ai-hint')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate AI hint for a GlobalCard' })
  async generateAiHint(
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<{ hint: string }>> {
    const result = await this.cardsService.generateAiHint(cardId);
    return new SuccessResponseDto(result, 'AI hint generated');
  }

  @Post(':cardId/audio/generate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate audio for a GlobalCard (lazy load)' })
  async generateAudio(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.generateAudio(user.id, cardId);
    return new SuccessResponseDto(card, 'Audio generated');
  }
}
