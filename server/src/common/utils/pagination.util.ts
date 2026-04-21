// src/common/utils/pagination.util.ts

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Calculate pagination offset
 */
export function getPaginationOffset(params: PaginationParams): number {
  const { page, limit } = params;
  return (Math.max(1, page) - 1) * Math.max(1, limit);
}

/**
 * Calculate total pages
 */
export function getTotalPages(totalItems: number, limit: number): number {
  return Math.ceil(totalItems / Math.max(1, limit));
}

/**
 * Build pagination metadata
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page: Math.max(1, page),
    limit: Math.max(1, limit),
    total,
    totalPages: getTotalPages(total, limit),
  };
}

/**
 * Parse sort query string (format: "field:asc" or "field:desc")
 */
export function parseSortQuery(sort?: string): SortParams {
  if (!sort) {
    return { field: 'createdAt', order: 'desc' };
  }

  const [field, order] = sort.split(':');
  const normalizedOrder = order?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  return {
    field: field || 'createdAt',
    order: normalizedOrder,
  };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page: number,
  limit: number,
  maxLimit: number = 100,
): { page: number; limit: number } {
  return {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), maxLimit),
  };
}

/**
 * Create pagination response
 */
export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  };
}
