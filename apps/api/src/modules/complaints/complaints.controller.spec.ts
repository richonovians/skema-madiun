import { Reflector } from '@nestjs/core';
import { AUDIT_KEY } from '../../common/decorators/audit.decorator';
import { ComplaintsController } from './complaints.controller';

/**
 * Rute yang servicenya memanggil `audit.record` sendiri TIDAK boleh memasang
 * `@Audit` (BUG-093, 18 November 2026).
 *
 * `AuditInterceptor` mencatat setiap handler bertanda `@Audit` sesudah handler
 * sukses. Bila servicenya juga mencatat, satu peristiwa lahir sebagai dua baris
 * `audit_logs`. Itulah yang terjadi pada penerusan sejak `e27c638`: satu baris
 * `{params, body}` dari dekorator dan satu baris `{complaintId, ...}` dari
 * service. Baris service yang dipertahankan, karena hanya ia yang memegang
 * tingkat dan kategori lama.
 *
 * Kuncinya dibaca dengan cara yang sama seperti interceptor membacanya
 * (`reflector.get(AUDIT_KEY, handler)`), jadi uji ini memerah tepat ketika
 * interceptor akan mencatat baris kedua.
 */
describe('ComplaintsController: pencatatan audit tidak ganda', () => {
  const reflector = new Reflector();

  it.each([
    ['forward', ComplaintsController.prototype.forward],
    ['alihkan', ComplaintsController.prototype.alihkan],
  ])('%s tanpa @Audit, karena service sudah mencatatnya sendiri', (_nama, handler) => {
    expect(reflector.get(AUDIT_KEY, handler)).toBeUndefined();
  });
});
