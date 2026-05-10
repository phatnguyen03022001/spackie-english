// src/modules/decks/dto/deck-response.dto.ts
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DeckResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty({ required: false })
  @Expose()
  description?: string;

  @ApiProperty({ required: false })
  @Expose()
  coverUrl?: string;

  @ApiProperty({ enum: ['PRIVATE', 'PUBLIC'] })
  @Expose()
  visibility!: string;

  @ApiProperty({ type: [String] })
  @Expose()
  tags!: string[];

  @ApiProperty()
  @Expose()
  isVipOnly!: boolean;

  @ApiProperty()
  @Expose()
  totalCards!: number;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  constructor(partial: Partial<DeckResponseDto>) {
    Object.assign(this, partial);
  }
}
