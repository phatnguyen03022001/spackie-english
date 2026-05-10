// src/modules/file-manager/dto/upload-file.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { FileRefType } from '@prisma/client';

export class UploadFileDto {
  @ApiPropertyOptional({
    description: 'Reference type (avatar, card_image, card_audio, deck_cover)',
    enum: FileRefType,
    example: 'CARD_IMAGE',
  })
  @IsOptional()
  @IsEnum(FileRefType)
  refType?: FileRefType;

  @ApiPropertyOptional({
    description: 'Reference entity ID (User/Card/Deck ID)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  refId?: string;
}
