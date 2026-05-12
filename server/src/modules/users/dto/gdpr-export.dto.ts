// src/modules/users/dto/gdpr-export.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CardProgressExportDto {
  @ApiProperty()
  front!: string;

  @ApiProperty()
  back?: string;

  @ApiProperty()
  easeFactor!: number;

  @ApiProperty()
  interval!: number;

  @ApiProperty()
  reviewCount!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class ListeningPracticeDto {
  @ApiProperty()
  type!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  duration!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class PaymentDto {
  @ApiProperty()
  orderCode!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  plan!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class GdprExportDto {
  user!: Record<string, unknown>;
  decks!: Record<string, unknown>[];
  cards!: CardProgressExportDto[];
  listeningPractices!: ListeningPracticeDto[];
  payments!: PaymentDto[];
  exportDate!: string;
}
