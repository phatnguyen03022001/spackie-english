// src/modules/users/dto/hard-delete-account.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HardDeleteAccountDto {
  @ApiProperty({ example: 'mypassword123' })
  @IsString()
  password!: string;

  @ApiProperty({ required: false, example: '123456' })
  @IsOptional()
  @IsString()
  otp?: string;
}
