/**
 * Metadata paginasi yang disisipkan ke `meta.pagination` pada respons list.
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Pembungkus hasil paginasi yang dikembalikan service.
 * `ResponseInterceptor` mendeteksi tipe ini → `data = items`, `meta.pagination = pagination`.
 */
export class PaginatedResult<T> {
  readonly items: T[];
  readonly pagination: PaginationMeta;

  constructor(items: T[], pagination: PaginationMeta) {
    this.items = items;
    this.pagination = pagination;
  }
}

/** Helper membangun PaginatedResult sekaligus menghitung `totalPages`. */
export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return new PaginatedResult<T>(items, { total, page, limit, totalPages });
}
