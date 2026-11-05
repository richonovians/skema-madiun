import { ComplaintStatus } from '@prisma/client';
import {
  ALUR_UTAMA,
  labelStatus,
  STATUS_ALTERNATIF,
  STATUS_BELUM_TUNTAS,
  STATUS_BOLEH_DIALIHKAN,
  STATUS_TUNTAS,
  TRANSISI_DIIZINKAN,
} from './alur-status.util';

/**
 * Yang dikunci di sini bukan sekadar "ada nilai baru di enum", melainkan
 * keputusan yang tak terbaca dari kodenya sendiri: `dialihkan` hanya boleh
 * ditulis oleh `ComplaintsService.alihkan()`, dan `perlu_perbaikan` sengaja
 * tetap boleh dialihkan.
 */
describe('aturan status dialihkan', () => {
  it('dialihkan belum tuntas dan bukan status tuntas', () => {
    expect(STATUS_BELUM_TUNTAS).toContain(ComplaintStatus.dialihkan);
    expect(STATUS_TUNTAS).not.toContain(ComplaintStatus.dialihkan);
  });

  it('dialihkan di luar alur utama', () => {
    expect(ALUR_UTAMA).not.toContain(ComplaintStatus.dialihkan);
    expect(STATUS_ALTERNATIF).toContain(ComplaintStatus.dialihkan);
  });

  it('updateStatus tak pernah dapat mencapai dialihkan', () => {
    for (const targets of Object.values(TRANSISI_DIIZINKAN)) {
      expect(targets).not.toContain(ComplaintStatus.dialihkan);
    }
  });

  it('keluar dari dialihkan sama dengan keluar dari menunggu_verifikasi', () => {
    expect(TRANSISI_DIIZINKAN[ComplaintStatus.dialihkan]).toEqual([
      ComplaintStatus.diverifikasi,
      ComplaintStatus.perlu_perbaikan,
      ComplaintStatus.ditolak,
    ]);
  });

  it('STATUS_BOLEH_DIALIHKAN tanpa terkirim, selesai, ditolak', () => {
    expect(STATUS_BOLEH_DIALIHKAN).toEqual([
      ComplaintStatus.menunggu_verifikasi,
      ComplaintStatus.diverifikasi,
      ComplaintStatus.sedang_ditindaklanjuti,
      ComplaintStatus.perlu_perbaikan,
      ComplaintStatus.dialihkan,
    ]);
  });

  it('labelStatus menerjemahkan dialihkan', () => {
    expect(labelStatus(ComplaintStatus.dialihkan)).toBe('Dialihkan');
  });
});
