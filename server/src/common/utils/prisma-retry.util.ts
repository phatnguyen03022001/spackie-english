// src/common/utils/prisma-retry.util.ts

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

/**
 * Prisma error codes that indicate transient faults safe to retry.
 * - P1001: Can't reach database server
 * - P1002: Connection timed out
 * - P1017: Server has closed the connection
 */
const TRANSIENT_ERROR_CODES = ['P1001', 'P1002', 'P1017'];

/**
 * Retry a Prisma operation on transient errors with exponential backoff.
 *
 * @param fn - The async function to retry (must be idempotent for safe retries)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in ms before first retry (default: 100)
 * @returns The result of the function
 * @throws The last error if all retries are exhausted or error is non-transient
 */
export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (
        error instanceof PrismaClientKnownRequestError &&
        TRANSIENT_ERROR_CODES.includes(error.code)
      ) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Non-transient error – throw immediately
      throw error;
    }
  }

  throw lastError!;
}
