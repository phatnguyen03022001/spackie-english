// src/modules/cards/dto/create-card-auto.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCardAutoDto {
  @ApiProperty({ example: 'apple' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => (value ? value.trim() : value))
  front!: string;
}
