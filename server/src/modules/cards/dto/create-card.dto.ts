// src/modules/cards/dto/create-card.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCardDto {
  @ApiProperty({ example: 'apple' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => (value ? value.trim() : value))
  front!: string;

  @ApiProperty({ required: false, example: 'quả táo' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: { value: string }) => (value ? value.trim() : value))
  back?: string;
}
