// src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@spackie.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  password!: string;

  @ApiProperty({
    required: false,
    description: 'Bắt buộc nếu đăng nhập với role ADMIN',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
