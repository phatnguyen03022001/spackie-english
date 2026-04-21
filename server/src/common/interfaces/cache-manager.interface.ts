// src/common/interfaces/cache-manager.interface.ts

export interface ICacheManager {
  /**
   * Get value by key
   * @returns value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value with optional TTL (seconds)
   */
  set(key: string, value: unknown, ttl?: number): Promise<void>;

  /**
   * Delete a single key
   */
  del(key: string): Promise<void>;

  /**
   * Delete all keys matching a pattern (e.g., "users:list:*")
   * Implementation should use SCAN + DEL to avoid blocking Redis
   */
  delPattern(pattern: string): Promise<void>;

  /**
   * Clear all cache (use with caution)
   */
  reset(): Promise<void>;

  /**
   * Check cache connectivity
   */
  ping(): Promise<string>;
}
