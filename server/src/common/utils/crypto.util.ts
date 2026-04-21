// src/common/utils/crypto.util.ts
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

/**
 * Hash a password using bcrypt
 * @param password - The password to hash
 * @param saltRounds - Number of salt rounds (default: 10, can be configured via BCRYPT_SALT_ROUNDS env var)
 * @returns Hashed password
 */
export async function hashPassword(
  password: string,
  saltRounds: number = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with a hash
 * @param password - Plain text password
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random token
 * @param length - Length of token in bytes (default: 32 bytes = 64 hex characters)
 * @returns Random hex string
 */
export function generateRandomToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}
