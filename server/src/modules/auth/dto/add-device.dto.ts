// src/modules/auth/dto/add-device.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddDeviceDto {
  @ApiProperty({
    example: 'device-uuid-12345',
    description: 'Unique device identifier',
  })
  @IsString()
  deviceId!: string;

  @ApiProperty({
    required: false,
    example: 'iPhone 15 Pro',
    description: 'Human-readable device name',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
