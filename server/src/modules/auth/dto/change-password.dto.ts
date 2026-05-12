// src/modules/auth/dto/change-password.dto.ts
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ss123', description: 'Current password' })
  @IsString()
  oldPassword!: string;

  @ApiProperty({
    example: 'NewP@ss456',
    description: 'New password (min 6 chars)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
