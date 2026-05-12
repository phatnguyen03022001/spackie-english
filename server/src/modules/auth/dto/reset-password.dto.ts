// src/modules/auth/dto/reset-password.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'OTP code sent to email' })
  @IsString()
  otp!: string;

  @ApiProperty({
    example: 'NewP@ss456',
    description: 'New password (min 6 chars)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
