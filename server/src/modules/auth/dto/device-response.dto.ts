// src/modules/auth/dto/device-response.dto.ts
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  deviceId!: string;

  @ApiProperty({ required: false })
  @Expose()
  deviceName?: string;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty({ required: false })
  @Expose()
  lastUsedAt?: Date;

  constructor(partial: Partial<DeviceResponseDto>) {
    Object.assign(this, partial);
  }
}
