// src/modules/file-manager/dto/file-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FileResponseDto {
  @ApiProperty({ description: 'File ID', example: '507f1f77bcf86cd799439011' })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'File URL',
    example: 'https://res.cloudinary.com/.../image.jpg',
  })
  @Expose()
  url!: string;

  @ApiProperty({
    description: 'Public ID on storage provider',
    example: 'users/abc123/avatar.jpg',
  })
  @Expose()
  publicId!: string;

  @ApiProperty({ description: 'Resource type', example: 'image' })
  @Expose()
  resourceType!: string;

  @ApiProperty({ description: 'MIME type', example: 'image/jpeg' })
  @Expose()
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes', example: 102400 })
  @Expose()
  sizeBytes!: number;

  @ApiPropertyOptional({
    description: 'Reference type',
    enum: ['AVATAR', 'CARD_IMAGE', 'CARD_AUDIO', 'DECK_COVER'],
    example: 'CARD_IMAGE',
  })
  @Expose()
  refType?: string;

  @ApiPropertyOptional({
    description: 'Reference entity ID',
    example: '507f1f77bcf86cd799439011',
  })
  @Expose()
  refId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  createdAt!: Date;
}
