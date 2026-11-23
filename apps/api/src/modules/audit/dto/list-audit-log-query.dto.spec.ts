import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListAuditLogQueryDto } from './list-audit-log-query.dto';

const medanGalat = async (over: Record<string, unknown>) =>
  (await validate(plainToInstance(ListAuditLogQueryDto, { page: 1, limit: 20, ...over }))).map(
    (e) => e.property,
  );

/**
 * Penyaring tanggal log audit hanya menerima `YYYY-MM-DD` (23 November 2026).
 *
 * Service menerjemahkannya sebagai hari WIB, jadi bentuk berjam tak punya arti
 * yang jelas di sana. Satu-satunya klien, `<input type="date">` di halaman Log
 * Audit, memang hanya mengirim `YYYY-MM-DD`. Sebelumnya `@IsDateString()`
 * tanpa `strict` juga meloloskan tanggal yang tak ada: '2026-02-31' diterima,
 * lalu `new Date` menggulungnya diam-diam menjadi 3 Maret.
 */
describe('ListAuditLogQueryDto -- startDate & endDate', () => {
  it.each(['startDate', 'endDate'])('%s menerima YYYY-MM-DD', async (medan) => {
    expect(await medanGalat({ [medan]: '2026-11-23' })).toEqual([]);
  });

  it.each(['startDate', 'endDate'])('%s menerima 29 Februari tahun kabisat', async (medan) => {
    expect(await medanGalat({ [medan]: '2028-02-29' })).toEqual([]);
  });

  it.each(['startDate', 'endDate'])('%s menolak bentuk berjam', async (medan) => {
    expect(await medanGalat({ [medan]: '2026-11-23T10:00:00Z' })).toContain(medan);
  });

  it.each(['startDate', 'endDate'])('%s menolak 31 Februari', async (medan) => {
    expect(await medanGalat({ [medan]: '2026-02-31' })).toContain(medan);
  });

  it.each(['startDate', 'endDate'])('%s menolak 29 Februari tahun biasa', async (medan) => {
    expect(await medanGalat({ [medan]: '2026-02-29' })).toContain(medan);
  });
});
