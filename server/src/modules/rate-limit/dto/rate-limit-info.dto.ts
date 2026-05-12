// src/modules/rate-limit/dto/rate-limit-info.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class TierLimitsDto {
  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 1000 })
  ttl!: number;

  @ApiProperty({ example: 5 })
  remaining!: number;
}

export class RateLimitInfoDto {
  @ApiProperty({ enum: ['FREE', 'VIP', 'ADMIN'], example: 'FREE' })
  tier!: 'FREE' | 'VIP' | 'ADMIN';

  @ApiProperty({ type: () => TierLimitsDto })
  limits!: {
    short: TierLimitsDto;
    medium: TierLimitsDto;
    long: TierLimitsDto;
  };
}
