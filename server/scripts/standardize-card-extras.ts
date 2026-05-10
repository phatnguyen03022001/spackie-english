#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Migration Script: Standardize Card Extras (Production‑ready)
 *
 * Usage:
 *   npx ts-node scripts/standardize-card-extras.ts [--dry-run]
 *
 * Environment variables:
 *   DEEPSEEK_API_KEY   – required
 *   DEEPSEEK_API_URL   – optional (default: https://api.deepseek.com/v1)
 *   DEEPSEEK_MODEL     – optional (default: deepseek-chat)
 *   BATCH_SIZE         – optional (default: 50)
 *   RATE_LIMIT_MS      – optional (default: 200) – ms between API calls
 */

import { PrismaClient } from '@prisma/client';
import type { Prisma, GlobalCard } from '@prisma/client';

// ==================== Configuration ====================
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS || '200', 10); // 5 req/sec
const DRY_RUN = process.argv.includes('--dry-run');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// ==================== Types ====================
interface DeepSeekResponse {
  vi: string;
  examples: string[];
  pronounce: string;
  pos: string;
  synonyms: string;
  antonyms: string;
}

// ==================== Helpers ====================
const prisma = new PrismaClient();

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Intelligently generate a second example from the first one by slightly altering context.
 * Fallback when DeepSeek fails to provide two examples.
 */
function generateSecondExample(word: string, firstExample: string): string {
  const lowerExample = firstExample.toLowerCase();
  if (lowerExample.includes('i ')) {
    return firstExample.replace(/I /i, 'You ');
  }
  if (lowerExample.includes('you ')) {
    return firstExample.replace(/You /i, 'We ');
  }
  // Default generic second example
  return `"${word}" is used in many contexts. (Từ "${word}" được dùng trong nhiều ngữ cảnh.)`;
}

/**
 * Format the `back` field from `extras` according to specification.
 */
function formatBackFromExtras(extras: Record<string, unknown>): string {
  const parts: string[] = [];

  const pronounce = getString(extras.pronounce);
  const pos = getString(extras.pos);
  const vi = getString(extras.vi);
  const synonyms = getString(extras.synonyms);
  const antonyms = getString(extras.antonyms);
  const examples = Array.isArray(extras.examples) ? extras.examples : [];

  if (pronounce) parts.push(`📢 ${pronounce}`);
  if (pos && vi) parts.push(`(${pos}) ${vi}`);
  else if (vi) parts.push(vi);
  if (synonyms) parts.push(`Đồng nghĩa: ${synonyms}`);
  if (antonyms) parts.push(`Trái nghĩa: ${antonyms}`);
  examples.forEach((ex, idx) => {
    if (ex) parts.push(`Ví dụ ${idx + 1}: ${ex}`);
  });

  return parts.join('\n');
}

/**
 * Call DeepSeek API to get enriched card data.
 */
async function callDeepSeek(word: string): Promise<DeepSeekResponse | null> {
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠️  DEEPSEEK_API_KEY not set. Skipping AI calls.');
    return null;
  }

  const systemPrompt = `You are a Vietnamese-English tutor. Return ONLY valid JSON (no extra text, no markdown).

The JSON must have exactly the following structure:
{
  "vi": "nghĩa tiếng Việt (1-2 từ ngắn gọn)",
  "examples": [
    "English sentence 1. (Vietnamese translation 1)",
    "English sentence 2. (Vietnamese translation 2)"
  ],
  "pronounce": "IPA pronunciation, e.g., /ˈkrɪmzən/",
  "pos": "part of speech (noun, verb, adjective, adverb, preposition, conjunction, interjection)",
  "synonyms": "1-2 synonyms separated by comma, or empty string",
  "antonyms": "1-2 antonyms separated by comma, or empty string"
}

Requirements:
- Each example must contain an English sentence followed by a Vietnamese translation in parentheses.
- The two examples must be different and illustrate different contexts of the word.
- Keep total token usage minimal (under 350 tokens).
- If unsure about synonyms/antonyms, use empty string.`;

  try {
    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: word },
        ],
        max_tokens: 350,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(
        `DeepSeek API error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content) as DeepSeekResponse;
      return {
        vi: parsed.vi || '',
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
        pronounce: parsed.pronounce || '',
        pos: parsed.pos || '',
        synonyms: parsed.synonyms || '',
        antonyms: parsed.antonyms || '',
      };
    } catch {
      console.warn(
        `Failed to parse DeepSeek response for "${word}":`,
        content.substring(0, 100),
      );
      return null;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`DeepSeek request failed for "${word}":`, message);
    return null;
  }
}

// ==================== Core Migration Logic ====================
async function processCard(
  card: GlobalCard,
): Promise<'updated' | 'skipped' | 'failed'> {
  const front = card.front;
  const extrasRaw = card.extras as unknown;
  const extras = isObject(extrasRaw) ? extrasRaw : {};

  // Check if we need to regenerate from AI
  const needsRegeneration =
    !extras.meaningReady ||
    !getString(extras.pronounce) ||
    !getString(extras.pos) ||
    !getString(extras.vi) ||
    !Array.isArray(extras.examples) ||
    extras.examples.length !== 2 ||
    extras.examples.some((ex: unknown) => !ex || typeof ex !== 'string');

  // Check for old `ex` field
  const hasOldEx =
    typeof extras.ex === 'string' &&
    (!Array.isArray(extras.examples) || extras.examples.length === 0);

  if (needsRegeneration && !hasOldEx) {
    // Try AI regeneration
    const result = await callDeepSeek(front);
    if (result && result.vi && result.examples.length >= 2) {
      // Ensure exactly 2 examples
      const examples = result.examples.slice(0, 2);
      if (examples.length === 1) {
        examples.push(generateSecondExample(front, examples[0]));
      }
      const newExtras: Record<string, unknown> = {
        meaningReady: true,
        pronounce: result.pronounce,
        pos: result.pos,
        vi: result.vi,
        examples,
        synonyms: result.synonyms || undefined,
        antonyms: result.antonyms || undefined,
      };
      const back = formatBackFromExtras(newExtras);
      if (!DRY_RUN) {
        await prisma.globalCard.update({
          where: { id: card.id },
          data: {
            extras: newExtras as Prisma.InputJsonValue,
            back,
            status: card.status === 'failed' ? 'meaning_ready' : card.status,
          },
        });
      }
      console.log(`✅ Regenerated: "${front}"`);
      return 'updated';
    }
    // Fallback: migrate old ex if available
    if (hasOldEx) {
      const oldEx = getString(extras.ex);
      const examples = [oldEx];
      if (examples.length === 1) {
        examples.push(generateSecondExample(front, examples[0]));
      }
      const newExtras: Record<string, unknown> = {
        ...extras,
        meaningReady: true,
        examples,
        ex: undefined, // remove old
      };
      delete newExtras.ex;
      const back = formatBackFromExtras(newExtras);
      if (!DRY_RUN) {
        await prisma.globalCard.update({
          where: { id: card.id },
          data: {
            extras: newExtras as Prisma.InputJsonValue,
            back,
          },
        });
      }
      console.log(`📝 Migrated old ex: "${front}"`);
      return 'updated';
    }
    console.warn(
      `⚠️  Cannot regenerate or migrate: "${front}" – manual review needed`,
    );
    return 'skipped';
  }

  // Card already has valid extras – just ensure back is correct
  const computedBack = formatBackFromExtras(extras);
  if (card.back !== computedBack) {
    if (!DRY_RUN) {
      await prisma.globalCard.update({
        where: { id: card.id },
        data: { back: computedBack },
      });
    }
    console.log(`🔄 Updated back format: "${front}"`);
    return 'updated';
  }

  console.log(`⏭️  Already compliant: "${front}"`);
  return 'skipped';
}

// ==================== Main ====================
async function main() {
  if (DRY_RUN) {
    console.log('🏁 DRY RUN MODE – no changes will be written to database\n');
  }

  const totalCards = await prisma.globalCard.count();
  console.log(`📊 Total cards in database: ${totalCards}\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  let lastId: string | undefined = undefined;

  while (true) {
    // Explicitly type batch as GlobalCard[]
    const batch: GlobalCard[] = await prisma.globalCard.findMany({
      take: BATCH_SIZE,
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
      orderBy: { id: 'asc' },
    });

    if (batch.length === 0) break;

    for (const card of batch) {
      processed++;
      try {
        const status = await processCard(card);
        if (status === 'updated') updated++;
        else if (status === 'skipped') skipped++;
        else if (status === 'failed') failed++;
      } catch (error) {
        failed++;
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed "${card.front}":`, msg);
      }
      // Rate limiting
      await delay(RATE_LIMIT_MS);
    }

    lastId = batch[batch.length - 1].id;
    console.log(
      `\n📈 Progress: ${processed}/${totalCards} (updated: ${updated}, skipped: ${skipped}, failed: ${failed})\n`,
    );
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 Migration Summary:');
  console.log(`   Total processed: ${processed}`);
  console.log(`   ✅ Updated:       ${updated}`);
  console.log(`   ⏭️  Skipped:       ${skipped}`);
  console.log(`   ❌ Failed:        ${failed}`);
  if (DRY_RUN) console.log('   ⚠️  Dry run – no actual changes');
  console.log('═══════════════════════════════════════\n');
}

// Graceful shutdown – wrap async handler to avoid no-misused-promises
process.on('SIGINT', () => {
  void (async () => {
    console.log('\n🛑 Received SIGINT. Disconnecting Prisma...');
    await prisma.$disconnect();
    process.exit(0);
  })();
});

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
