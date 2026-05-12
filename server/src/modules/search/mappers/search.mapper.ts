// src/modules/search/mappers/search.mapper.ts
import { Injectable } from '@nestjs/common';
import { Deck, GlobalCard, DeckCardMapping } from '@prisma/client';
import {
  DeckSearchResultDto,
  CardSearchResultDto,
} from '@modules/search/dto/search-response.dto';
import { plainToInstance } from 'class-transformer';

type DeckWithOwner = Deck & {
  user?: { displayName?: string | null; username?: string | null };
};
type CardWithDeck = GlobalCard & {
  deckMappings?: (DeckCardMapping & {
    deck?: Deck & {
      user?: { displayName?: string | null; username?: string | null };
    };
  })[];
};

@Injectable()
export class SearchMapper {
  toDeckSearchResultDto(deck: DeckWithOwner): DeckSearchResultDto {
    return plainToInstance(DeckSearchResultDto, {
      id: deck.id,
      title: deck.title,
      description: deck.description ?? undefined,
      coverUrl: deck.coverUrl ?? undefined,
      ownerName: deck.user?.displayName || deck.user?.username || 'Unknown',
      totalCards: deck.totalCards,
    });
  }

  toDeckSearchResultDtoList(decks: DeckWithOwner[]): DeckSearchResultDto[] {
    return decks.map((deck) => this.toDeckSearchResultDto(deck));
  }

  toCardSearchResultDto(card: CardWithDeck): CardSearchResultDto | null {
    const mapping = card.deckMappings?.[0];
    if (!mapping?.deck) return null;
    return plainToInstance(CardSearchResultDto, {
      id: card.id,
      front: card.front,
      back: card.back ?? undefined,
      deckId: mapping.deck.id,
      deckTitle: mapping.deck.title,
      imageUrl: card.imageUrl ?? undefined,
    });
  }

  toCardSearchResultDtoList(cards: CardWithDeck[]): CardSearchResultDto[] {
    return cards
      .map((card) => this.toCardSearchResultDto(card))
      .filter((dto): dto is CardSearchResultDto => dto !== null);
  }
}
