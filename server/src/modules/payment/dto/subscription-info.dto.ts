// src/modules/payment/dto/subscription-info.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionInfoDto {
  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: 'premium_monthly' })
  plan!: string;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z', nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z', nullable: true })
  expiresAt!: Date | null;

  @ApiProperty({ example: true })
  autoRenew!: boolean;
}

export class CreatePaymentResponseDto {
  @ApiProperty({ example: 'ORDER123456' })
  orderCode!: string;

  @ApiProperty({ example: 'https://checkout.payos.vn/abc123' })
  checkoutUrl!: string;
}

export class AdminSubscriptionListDto {
  @ApiProperty({ type: [SubscriptionInfoDto] })
  items!: SubscriptionInfoDto[];

  @ApiProperty({ example: 10 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;
}
