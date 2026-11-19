import { PERAN_BEBAN, identitasResponden } from './lib/akun-beban';
import { SKENARIO, SKENARIO_TULIS } from './skenario';

/**
 * Daftar peran skenario dan daftar peran akun beban harus sepakat.
 *
 * `jalankan.ts` menerbitkan satu sesi per nilai `PERAN_BEBAN`, lalu setiap
 * skenario mengambil sesi menurut `peran`-nya (baku `kabupaten`). Peran yang
 * dipakai skenario tetapi tak ada di daftar akun menghasilkan header
 * `authorization: undefined`, dan jawabannya 401 yang terbaca seperti cacat
 * penjaga -- bukan seperti salah susun pelarinya.
 */
describe('SKENARIO uji beban', () => {
  it('setiap peran yang dipakai skenario dimiliki akun beban', () => {
    for (const s of SKENARIO) {
      if (s.publik === true) continue;
      expect(PERAN_BEBAN).toContain(s.peran ?? 'kabupaten');
    }
  });

  it('nama skenario unik, karena --skenario= memilih menurut nama', () => {
    const nama = SKENARIO.map((s) => s.nama);
    expect(new Set(nama).size).toBe(nama.length);
  });

  /**
   * Dashboard Admin OPD tak punya skenario sampai 4 November 2026, padahal
   * QA-PERF meminta "dashboard < 3 detik" dan endpoint ini ikut menerima
   * penyaring Sampah BUG-013 yang memperlambat `/statistics` (BUG-067).
   * `@Roles(opd)` menolak sesi `kabupaten`, jadi ia butuh sesi `opd` sendiri.
   */
  it('dashboard Admin OPD diukur dengan sesi berperan opd', () => {
    const s = SKENARIO.find((x) => x.nama === 'dashboard-opd');
    expect(s).toBeDefined();
    expect(s?.jalur).toBe('/api/v1/dashboard/opd');
    expect(s?.peran).toBe('opd');
  });
});

/**
 * Jalur tulis (§11 `docs/TEST_BEBAN.md`, dijalankan 19 November 2026).
 *
 * `--semua` sudah tercatat di dokumen sebagai perintah pengukuran BACA dengan
 * syarat "selisih baris nol". Bila skenario tulis ikut masuk `SKENARIO`,
 * perintah yang sama diam-diam berganti arti: ia menulis ribuan pengaduan dan
 * setiap jalan baca berikutnya diukur di atas dataset yang bergeser.
 */
describe('SKENARIO_TULIS', () => {
  it('--semua tetap hanya membaca', () => {
    for (const s of SKENARIO) {
      expect(s.method).toBe('GET');
    }
  });

  it('memuat keempat skenario rancangan §11.3', () => {
    expect(SKENARIO_TULIS.map((s) => s.nama).sort()).toEqual([
      'batas-harian-serentak',
      'kirim-jawaban',
      'kirim-pengaduan',
      'kirim-pengaduan-lampiran',
    ]);
  });

  it('nama unik lintas kedua daftar, karena --skenario= mencari di keduanya', () => {
    const nama = [...SKENARIO, ...SKENARIO_TULIS].map((s) => s.nama);
    expect(new Set(nama).size).toBe(nama.length);
  });

  it('hanya batas-harian-serentak yang memakai batas harian ASLI', () => {
    const asli = SKENARIO_TULIS.filter((s) => s.batasHarianAsli === true).map((s) => s.nama);
    expect(asli).toEqual(['batas-harian-serentak']);
  });
});

describe('identitasResponden', () => {
  it('berpadding tiga digit supaya urut menurut abjad sama dengan urut angka', () => {
    expect(identitasResponden(7)).toBe('beban-responden-007');
    expect(identitasResponden(100)).toBe('beban-responden-100');
  });
});

/**
 * Skenario tulis berkecepatan diukur dengan JUMLAH TETAP, bukan durasi.
 *
 * Terukur 19 November 2026 pada jalan pertama `kirim-pengaduan` berdurasi 10 s:
 * autocannon berhenti menghitung saat durasinya habis, padahal sepuluh
 * permintaan masih terbang dan sebagian besar tetap ditulis server. Hasilnya
 * "1.117 baris untuk 1.109 jawaban 2xx" -- terbaca seperti tulisan berganda,
 * padahal hanya permintaan yang jawabannya tak pernah ditunggu (1.113
 * terkirim, 1.103 terjawab pada jalan ulang). Dengan jumlah tetap autocannon
 * menunggu setiap jawaban, dan selisih baris kembali dapat dibandingkan.
 */
describe('jumlah tetap skenario tulis', () => {
  it('setiap skenario tulis autocannon membawa jumlahBaku', () => {
    for (const s of SKENARIO_TULIS) {
      if (s.jenis === 'batas-harian' || s.jenis === 'jawaban') continue;
      expect(s.jumlahBaku).toBeGreaterThan(0);
    }
  });
});
