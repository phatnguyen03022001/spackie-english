import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestDeviceOtpDto {
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
    required: false,
    example: 'MacBook Pro',
    description: 'Human-readable device name',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
