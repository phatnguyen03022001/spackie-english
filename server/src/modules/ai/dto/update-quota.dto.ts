// src/modules/ai/dto/update-quota.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class UpdateQuotaDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Monthly limit in USD cents' })
  @IsNumber()
  @Min(0)
  monthlyLimitCents!: number;
}
