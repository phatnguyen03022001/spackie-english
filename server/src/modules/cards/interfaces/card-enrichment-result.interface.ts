// src/modules/cards/interfaces/card-enrichment-result.interface.ts

/**
 * Strictly typed extras structure for vocabulary cards.
 * After enrichment, all fields except synonyms/antonyms are required.
 */
export interface CardExtras {
  meaningReady: true;
  pronounce: string; // IPA pronunciation, e.g., "/ˈkrɪmzən/"
  pos: string; // part of speech: "noun", "verb", "adjective", ...
  vi: string; // primary Vietnamese meaning (short)
  examples: string[]; // array of exactly 2 example sentences (English + Vi translation)
  synonyms?: string; // optional comma-separated list
  antonyms?: string; // optional comma-separated list
}

export interface CardEnrichmentResult {
  back?: string; // kept for backward compatibility, but meaning should go to extras
  audioUrl?: string;
  extras: CardExtras | Record<string, unknown>;
}
