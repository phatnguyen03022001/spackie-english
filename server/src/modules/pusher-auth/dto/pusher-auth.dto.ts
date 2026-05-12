// src/modules/pusher-auth/dto/pusher-auth.dto.ts
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PusherAuthDto {
  @ApiProperty({ example: '1234.5678' })
  @IsString()
  socket_id!: string;

  @ApiProperty({ example: 'private-user-abc123' })
  @IsString()
  channel_name!: string;
}

export class PusherAuthResponseDto {
  @ApiProperty()
  auth!: string;

  @ApiProperty({ required: false })
  channel_data?: string;
}
