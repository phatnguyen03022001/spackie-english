// src/modules/auth/dto/add-device.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddDeviceDto {
  @ApiProperty()
  @IsString()
  deviceId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
