// src/modules/study/utils/sm2-algorithm.ts
import type { CardRating } from '@prisma/client';
import type { IStudySM2Result } from '@modules/study/interfaces/study.interface';

/**
 * SM-2 Algorithm implementation for spaced repetition.
 * Based on the original SM-2 algorithm by Piotr Wozniak.
 *
 * Quality ratings mapping:
 *   AGAIN (0) - Complete blackout, incorrect response
 *   HARD  (2) - Incorrect response but upon seeing the correct answer it felt familiar
 *   GOOD  (3) - Correct response with some difficulty
 *   EASY  (5) - Perfect response with no difficulty
 */
export function calculateSM2(
  rating: CardRating,
  previous: {
    easeFactor: number;
    interval: number;
    repetitions: number;
  },
): IStudySM2Result {
  const quality = ratingToQuality(rating);
  let { easeFactor, interval, repetitions } = previous;

  // Ensure minimum ease factor
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  if (quality < 3) {
    // Failed: reset repetitions, short interval
    repetitions = 0;
    interval = 1; // 1 day
  } else {
    // Successful response
    if (repetitions === 0) {
      interval = 1; // 1 day
    } else if (repetitions === 1) {
      interval = 6; // 6 days
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor based on quality
  const newEase =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, newEase);

  // Calculate next due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);
  dueDate.setHours(0, 0, 0, 0);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    dueDate,
  };
}

function ratingToQuality(rating: CardRating): number {
  switch (rating) {
    case 'AGAIN':
      return 0;
    case 'HARD':
      return 2;
    case 'GOOD':
      return 3;
    case 'EASY':
      return 5;
    default:
      return 3;
  }
}

/**
 * Calculate streak based on last study date.
 * If last studied yesterday, increment streak.
 * If last studied today, keep streak.
 * If last studied before yesterday, reset streak to 1.
 */
export function calculateStreak(
  currentStreak: number,
  longestStreak: number,
  lastStudiedAt: Date | null,
): { currentStreak: number; longestStreak: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (!lastStudiedAt) {
    return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1) };
  }

  const lastStudy = new Date(lastStudiedAt);
  lastStudy.setHours(0, 0, 0, 0);

  if (lastStudy.getTime() === today.getTime()) {
    // Already studied today, keep streak
    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
    };
  }

  if (lastStudy.getTime() === yesterday.getTime()) {
    // Studied yesterday, increment streak
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(longestStreak, newStreak),
    };
  }

  // Streak broken, reset to 1
  return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1) };
}
