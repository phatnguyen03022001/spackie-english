// src/modules/search/dto/search-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class DeckSearchResultDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty({ required: false })
  @Expose()
  description?: string;

  @ApiProperty({ required: false })
  @Expose()
  coverUrl?: string;

  @ApiProperty()
  @Expose()
  ownerName!: string;

  @ApiProperty()
  @Expose()
  totalCards!: number;

  constructor(partial: Partial<DeckSearchResultDto>) {
    Object.assign(this, partial);
  }
}

export class CardSearchResultDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  front!: string;

  @ApiProperty({ required: false })
  @Expose()
  back?: string;

  @ApiProperty()
  @Expose()
  deckId!: string;

  @ApiProperty()
  @Expose()
  deckTitle!: string;

  @ApiProperty({ required: false })
  @Expose()
  imageUrl?: string;

  constructor(partial: Partial<CardSearchResultDto>) {
    Object.assign(this, partial);
  }
}

export class SearchResponseDto {
  @ApiProperty({ type: [DeckSearchResultDto] })
  decks: DeckSearchResultDto[];

  @ApiProperty({ type: [CardSearchResultDto] })
  cards: CardSearchResultDto[];

  @ApiProperty()
  totalDecks: number;

  @ApiProperty()
  totalCards: number;

  constructor(
    decks: DeckSearchResultDto[],
    cards: CardSearchResultDto[],
    totalDecks: number,
    totalCards: number,
  ) {
    this.decks = decks;
    this.cards = cards;
    this.totalDecks = totalDecks;
    this.totalCards = totalCards;
  }
}
