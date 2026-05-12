import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyDeviceOtpDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Admin email' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'device-uuid-12345',
    description: 'Unique device identifier',
  })
  @IsString()
  deviceId!: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP code received via email',
  })
  @IsString()
  otp!: string;
}
