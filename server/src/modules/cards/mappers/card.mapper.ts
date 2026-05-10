// src/modules/cards/mappers/card.mapper.ts
import { Injectable } from '@nestjs/common';
import { GlobalCard } from '@prisma/client';
import { CardResponseDto } from '../dto/card-response.dto';
import { plainToInstance } from 'class-transformer';
import { CardExtras } from '../interfaces/card-enrichment-result.interface';

/**
 * Format back content from extras (meaning data).
 * This ensures consistent formatting across all cards.
 * Format:
 *   📢 {pronounce}
 *   ({pos}) {vi}
 *   Đồng nghĩa: {synonyms}   (if exists)
 *   Trái nghĩa: {antonyms}   (if exists)
 *   Ví dụ 1: {examples[0]}
 *   Ví dụ 2: {examples[1]}
 */
export function formatBackFromExtras(extras: CardExtras): string {
  const parts: string[] = [];

  if (extras.pronounce) {
    parts.push(`📢 ${extras.pronounce}`);
  }

  if (extras.pos && extras.vi) {
    parts.push(`(${extras.pos}) ${extras.vi}`);
  } else if (extras.vi) {
    parts.push(extras.vi);
  }

  if (extras.synonyms) {
    parts.push(`Đồng nghĩa: ${extras.synonyms}`);
  }

  if (extras.antonyms) {
    parts.push(`Trái nghĩa: ${extras.antonyms}`);
  }

  // Handle examples array (expect exactly 2)
  if (extras.examples && extras.examples.length > 0) {
    extras.examples.forEach((example, index) => {
      if (example) {
        parts.push(`Ví dụ ${index + 1}: ${example}`);
      }
    });
  }

  return parts.join('\n');
}

@Injectable()
export class CardMapper {
  toResponseDto(card: GlobalCard): CardResponseDto {
    const dto = plainToInstance(CardResponseDto, card, {
      excludeExtraneousValues: true,
    });

    // Compute back from extras if back is null/empty and extras has meaning data
    if (!dto.back && card.extras && typeof card.extras === 'object') {
      const extras = card.extras as Record<string, unknown>;
      if (extras.meaningReady === true) {
        dto.back = formatBackFromExtras(extras as unknown as CardExtras);
      }
    }

    return dto;
  }

  toResponseDtoList(cards: GlobalCard[]): CardResponseDto[] {
    return cards.map((c) => this.toResponseDto(c));
  }
}
