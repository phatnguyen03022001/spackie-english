// src/modules/users/dto/update-user.dto.ts
import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
