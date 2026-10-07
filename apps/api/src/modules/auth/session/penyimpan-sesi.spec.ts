import { PenyimpanSesiMemori } from './penyimpan-sesi.memori';

/**
 * Kontrak `PenyimpanSesi` (7 Oktober 2026).
 *
 * Diuji lewat implementasi memorinya, bukan Redis: uji unit tak boleh menuntut
 * layanan hidup. Pola yang sama dipakai `OpdSource` / `StubOpdSource`.
 *
 * Implementasi Redis WAJIB lulus berkas ini juga. Kontraknya satu, dan
 * perbedaan perilaku di antara keduanya adalah cacat, bukan detail.
 */
describe('PenyimpanSesi (memori)', () => {
  let penyimpan: PenyimpanSesiMemori;

  beforeEach(() => {
    penyimpan = new PenyimpanSesiMemori();
  });

  const catatan = (over = {}) => ({
    uid: 7,
    abs: Math.floor(Date.now() / 1000) + 3600,
    ua: 'Chrome',
    ip: '127.0.0.1',
    ...over,
  });

  it('sid yang sudah disimpan dinyatakan hidup', async () => {
    await penyimpan.simpan('sid-a', catatan());

    await expect(penyimpan.hidup('sid-a')).resolves.toBe(true);
  });

  it('sid yang tak pernah disimpan dinyatakan mati', async () => {
    await expect(penyimpan.hidup('sid-asing')).resolves.toBe(false);
  });

  it('sid yang dicabut tidak lagi hidup', async () => {
    await penyimpan.simpan('sid-a', catatan());

    await penyimpan.cabut('sid-a');

    await expect(penyimpan.hidup('sid-a')).resolves.toBe(false);
  });

  it('mencabut seluruh sesi satu akun, dan tidak menyentuh akun lain', async () => {
    await penyimpan.simpan('sid-a', catatan({ uid: 7 }));
    await penyimpan.simpan('sid-b', catatan({ uid: 7 }));
    await penyimpan.simpan('sid-lain', catatan({ uid: 8 }));

    await penyimpan.cabutSemua(7);

    await expect(penyimpan.hidup('sid-a')).resolves.toBe(false);
    await expect(penyimpan.hidup('sid-b')).resolves.toBe(false);
    // Tanpa baris ini ujinya lolos walau implementasinya mengosongkan SELURUH
    // penyimpan, dan cacat itu baru ketahuan di produksi sebagai semua orang
    // ikut terlempar keluar.
    await expect(penyimpan.hidup('sid-lain')).resolves.toBe(true);
  });

  it('mendaftar sesi milik satu akun beserta keterangan perangkatnya', async () => {
    await penyimpan.simpan('sid-a', catatan({ uid: 7, ua: 'Chrome' }));
    await penyimpan.simpan('sid-b', catatan({ uid: 7, ua: 'Firefox' }));
    await penyimpan.simpan('sid-lain', catatan({ uid: 8 }));

    const daftar = await penyimpan.daftar(7);

    expect(daftar.map((s) => s.sid).sort()).toEqual(['sid-a', 'sid-b']);
    expect(daftar.find((s) => s.sid === 'sid-b')?.ua).toBe('Firefox');
  });

  it('sesi yang sudah lewat pagu mutlaknya tidak lagi hidup', async () => {
    // `abs` di masa lalu. Tanpa penjagaan ini sesi akan hidup selamanya di
    // penyimpan sekalipun tokennya sendiri sudah mati.
    await penyimpan.simpan('sid-basi', catatan({ abs: Math.floor(Date.now() / 1000) - 1 }));

    await expect(penyimpan.hidup('sid-basi')).resolves.toBe(false);
  });

  it('sesi yang kedaluwarsa ikut hilang dari daftar akunnya', async () => {
    // Indeks per akun tak punya TTL per anggota, jadi anggota basi harus
    // dipangkas saat dibaca. Tanpa itu daftar perangkat menampilkan sesi mati.
    await penyimpan.simpan('sid-hidup', catatan({ uid: 7 }));
    await penyimpan.simpan('sid-basi', catatan({ uid: 7, abs: Math.floor(Date.now() / 1000) - 1 }));

    const daftar = await penyimpan.daftar(7);

    expect(daftar.map((s) => s.sid)).toEqual(['sid-hidup']);
  });
});
