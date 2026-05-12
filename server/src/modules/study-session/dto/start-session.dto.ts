// src/modules/study-session/dto/start-session.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StartSessionDto {
  @ApiPropertyOptional({ description: 'Optional deck ID to limit scope' })
  @IsOptional()
  @IsString()
  deckId?: string;
}
