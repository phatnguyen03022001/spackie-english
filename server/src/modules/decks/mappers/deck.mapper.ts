// src/modules/decks/mappers/deck.mapper.ts
import { Injectable } from '@nestjs/common';
import { Deck } from '@prisma/client';
import { DeckResponseDto } from '@modules/decks/dto/deck-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class DeckMapper {
  toResponseDto(deck: Deck): DeckResponseDto {
    return plainToInstance(DeckResponseDto, deck, {
      excludeExtraneousValues: true,
    });
  }

  toResponseDtoList(decks: Deck[]): DeckResponseDto[] {
    return decks.map((deck) => this.toResponseDto(deck));
  }
}
