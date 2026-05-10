// src/modules/cards/utils/card-media.util.ts

/**
 * Rút gọn front text thành keyword tìm ảnh.
 * Với multi-word (phrasal verb, idiom), lấy từ đầu tiên.
 * Ví dụ: "walk away from" → "walk", "apple" → "apple"
 */
export function extractKeywordForImage(front: string): string {
  const words = front.trim().split(/\s+/);
  if (words.length === 0) return front;
  return words[0].toLowerCase();
}

export function normalizeFront(front: string): string {
  return front.trim().toLowerCase();
}

export function dedupeFronts(fronts: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const front of fronts) {
    const normalized = normalizeFront(front);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}
