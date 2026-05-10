// src/modules/cards/dto/create-card-batch.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCardBatchDto {
  @ApiProperty({
    type: [String],
    example: ['apple', 'walk away from', 'banana'],
    description: 'Array of words/phrases to auto-create cards (max 10)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  @Matches(/^[a-zA-Z\s\-']+$/, {
    each: true,
    message:
      'Each front must only contain letters, spaces, hyphens, and apostrophes',
  })
  @Transform(
    ({ value }: { value: string[] }) =>
      value?.map((v: string) => v.trim()) ?? value,
  )
  fronts!: string[];

  @ApiProperty({
    required: false,
    description: 'Idempotency key (UUID v4)',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
