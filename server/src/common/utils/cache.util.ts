// src/common/utils/cache.util.ts

/**
 * Cache key utilities following standard format: {domain}:{resource}:{identifier}
 */

export class CacheKeyBuilder {
  /**
   * Build cache key for single resource
   * Format: {domain}:{resource}:{identifier}
   */
  static resource(
    domain: string,
    resource: string,
    identifier: string | number,
  ): string {
    return `${domain}:${resource}:${identifier}`;
  }

  /**
   * Build cache key for list with pagination
   * Format: {domain}:{resource}:list:page:{page}:limit:{limit}
   */
  static list(
    domain: string,
    resource: string,
    page: number,
    limit: number,
    filters?: Record<string, string | number>,
  ): string {
    let key = `${domain}:${resource}:list:page:${page}:limit:${limit}`;

    if (filters && Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join(':');
      key += `:${filterStr}`;
    }

    return key;
  }

  /**
   * Build cache key for list with search
   * Format: {domain}:{resource}:list:search:{searchTerm}:page:{page}:limit:{limit}
   */
  static search(
    domain: string,
    resource: string,
    searchTerm: string,
    page: number,
    limit: number,
  ): string {
    const normalizedSearch = searchTerm
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
    return `${domain}:${resource}:list:search:${normalizedSearch}:page:${page}:limit:${limit}`;
  }

  /**
   * Build cache key pattern for invalidating all list cache of a resource
   * Format: {domain}:{resource}:list:*
   */
  static listPattern(domain: string, resource: string): string {
    return `${domain}:${resource}:list:*`;
  }

  /**
   * Build cache key for user-specific data
   * Format: {domain}:{resource}:user:{userId}:{identifier}
   */
  static userResource(
    domain: string,
    resource: string,
    userId: string | number,
    identifier?: string | number,
  ): string {
    const base = `${domain}:${resource}:user:${userId}`;
    return identifier ? `${base}:${identifier}` : base;
  }
}

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  USER_PROFILE: 300, // 5 minutes
  PRODUCT_DETAIL: 600, // 10 minutes
  LIST: 60, // 1 minute
  CONFIG: 3600, // 1 hour
  REAL_TIME: 30, // 30 seconds
} as const;
