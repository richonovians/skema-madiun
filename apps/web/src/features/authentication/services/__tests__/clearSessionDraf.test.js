import { IDBFactory } from 'fake-indexeddb';
import { ambilDraf, simpanDraf } from '@/utils/drafLokal';
import { clearSession } from '../authStorage';

/**
 * PAGAR untuk jebakan utama draf lintas tab (23 November 2026). Interseptor
 * 401 di `services/api.js` memanggil `clearSession({ sesiServerSudahDitolak:
 * true })` tepat saat sesi berakhir di tengah pengisian. Bila suatu saat
 * `clearSession` ikut menghapus draf, draf hilang persis ketika dibutuhkan.
 */
beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

it('clearSession pada jalur 401 tidak menyentuh draf', async () => {
  await simpanDraf('pengaduan', { pemilik: 10, kedaluwarsa: Date.now() + 60000, isi: {} });

  clearSession({ sesiServerSudahDitolak: true });
  await new Promise((r) => setTimeout(r, 50));

  expect(await ambilDraf('pengaduan')).not.toBeNull();
});
