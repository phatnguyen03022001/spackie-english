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
  ApiResponse,
  ApiBody,
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
  @ApiResponse({
    status: 200,
    description: 'Card detail',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({ status: 404, description: 'CARD_NOT_FOUND' })
  async findGlobalCard(
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.findGlobalCardById(cardId);
    return new SuccessResponseDto(card);
  }

  @Patch(':cardId')
  @ApiOperation({ summary: 'Update GlobalCard (standalone)' })
  @ApiResponse({
    status: 200,
    description: 'Card updated',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED' })
  @ApiResponse({ status: 404, description: 'CARD_NOT_FOUND' })
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Card image (jpg, jpeg, png, gif, webp) - max 5MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Image uploaded',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({
    status: 422,
    description: 'UNPROCESSABLE_ENTITY - invalid file type or size',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Image deleted',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'CARD_NOT_FOUND or IMAGE_NOT_FOUND',
  })
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Card audio (mp3, wav, ogg, m4a) - max 10MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Audio uploaded',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({
    status: 422,
    description: 'UNPROCESSABLE_ENTITY - invalid file type or size',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Audio deleted',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'CARD_NOT_FOUND or AUDIO_NOT_FOUND',
  })
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
  @ApiResponse({
    status: 200,
    description: 'AI hint generated',
  })
  @ApiResponse({ status: 404, description: 'CARD_NOT_FOUND' })
  async generateAiHint(
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<{ hint: string }>> {
    const result = await this.cardsService.generateAiHint(cardId);
    return new SuccessResponseDto(result, 'AI hint generated');
  }

  @Post(':cardId/audio/generate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate audio for a GlobalCard (lazy load)' })
  @ApiResponse({
    status: 200,
    description: 'Audio generated',
    type: SuccessResponseDto<CardResponseDto>,
  })
  @ApiResponse({ status: 404, description: 'CARD_NOT_FOUND' })
  async generateAudio(
    @CurrentUser() user: RequestUser,
    @Param('cardId') cardId: string,
  ): Promise<SuccessResponseDto<CardResponseDto>> {
    const card = await this.cardsService.generateAudio(user.id, cardId);
    return new SuccessResponseDto(card, 'Audio generated');
  }
}
