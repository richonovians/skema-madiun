import { PaginatedResult, paginate } from './paginated-result';

describe('paginate', () => {
  it('mengembalikan PaginatedResult dengan totalPages di-ceil', () => {
    const result = paginate([{ id: 1 }, { id: 2 }], 21, 1, 20);

    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.items).toHaveLength(2);
    expect(result.pagination).toEqual({ total: 21, page: 1, limit: 20, totalPages: 2 });
  });

  it('kelipatan pas → totalPages tepat', () => {
    expect(paginate([], 40, 2, 20).pagination.totalPages).toBe(2);
  });

  it('total 0 → totalPages 0', () => {
    expect(paginate([], 0, 1, 20).pagination.totalPages).toBe(0);
  });
});
