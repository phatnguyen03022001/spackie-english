// src/modules/listening/dto/start-listening.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ListeningType } from '@modules/listening/interfaces/listening.interface';

export class StartListeningDto {
  @ApiProperty({ description: 'Global card ID' })
  @IsString()
  globalCardId!: string;

  @ApiProperty({ enum: ListeningType })
  @IsEnum(ListeningType)
  type!: ListeningType;

  @ApiPropertyOptional({ description: 'YouTube URL for YOUTUBE_SYNC type' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;
}
