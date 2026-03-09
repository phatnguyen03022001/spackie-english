export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export class PaginationResponseDto<T> {
  readonly data: T[];
  readonly meta: PaginationMeta;

  constructor(data: T[], totalItems: number, page: number, limit: number) {
    const totalPages = Math.ceil(totalItems / limit);

    this.data = data;
    this.meta = {
      page,
      limit,
      totalItems,
      totalPages,
    };
  }
}
