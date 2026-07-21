import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

describe('PaginationQueryDto', () => {
  const build = (obj: Record<string, unknown>): PaginationQueryDto =>
    plainToInstance(PaginationQueryDto, obj);

  it('memakai default page=1, limit=20 saat query kosong', () => {
    const dto = build({});
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('mengonversi query string angka menjadi number', () => {
    const dto = build({ page: '3', limit: '50' });
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);
  });

  it('menolak limit > 100', () => {
    expect(validateSync(build({ limit: '101' })).length).toBeGreaterThan(0);
  });

  it('menolak page < 1 dan non-integer', () => {
    expect(validateSync(build({ page: '0' })).length).toBeGreaterThan(0);
    expect(validateSync(build({ page: 'abc' })).length).toBeGreaterThan(0);
  });
});
