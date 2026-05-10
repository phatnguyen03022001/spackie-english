// src/modules/cards/dto/card-response.dto.ts
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CardResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  front!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  back?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @Expose()
  audioUrl?: string;

  @ApiProperty({ type: Object })
  @Expose()
  extras!: Record<string, unknown>;

  @ApiProperty({
    enum: ['pending', 'meaning_ready', 'completed', 'partial', 'failed'],
  })
  @Expose()
  status!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  errorMessage?: string;

  @ApiProperty({ default: false })
  @Expose()
  validated!: boolean;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  valid?: boolean | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  validationError?: string | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  constructor(partial: Partial<CardResponseDto>) {
    Object.assign(this, partial);
  }
}
