// src/modules/favorite/dto/favorite-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FavoriteResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Expose()
  userId!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @Expose()
  deckId!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createdAt!: Date;
}
