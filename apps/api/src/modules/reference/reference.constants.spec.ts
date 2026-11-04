import { TingkatPengaduan } from '@prisma/client';
import {
  COMPLAINT_CATEGORIES,
  kategoriPengaduan,
  namaUnsur,
  tingkatKategoriPengaduan,
} from './reference.constants';

describe('namaUnsur', () => {
  it('menerjemahkan kode unsur baku ke nama resminya', () => {
    expect(namaUnsur('U1')).toBe('Persyaratan');
    expect(namaUnsur('U9')).toBe('Penanganan Pengaduan, Saran, dan Masukan');
  });

  it('mengembalikan null untuk kode yang tidak dikenal', () => {
    expect(namaUnsur('X1')).toBeNull();
  });

  it('mengembalikan null untuk kode kosong, null, atau tak ada', () => {
    expect(namaUnsur('')).toBeNull();
    expect(namaUnsur(null)).toBeNull();
    expect(namaUnsur(undefined)).toBeNull();
  });
});

describe('COMPLAINT_CATEGORIES (taksonomi per tingkat, 4 November 2026)', () => {
  it('memuat 8 kategori kecamatan dan 21 kategori kabupaten', () => {
    // Jumlahnya DIPAKU karena daftarnya diberikan pengguna secara tersurat.
    // Baris yang hilang atau terduplikasi saat penyuntingan berikutnya akan
    // terlihat di sini, bukan di dropdown yang kurang satu pilihan.
    expect(kategoriPengaduan(TingkatPengaduan.kecamatan)).toHaveLength(8);
    expect(kategoriPengaduan(TingkatPengaduan.kabupaten)).toHaveLength(21);
    expect(COMPLAINT_CATEGORIES).toHaveLength(29);
  });

  it('tidak punya kode ganda', () => {
    const kode = COMPLAINT_CATEGORIES.map((k) => k.kode);

    expect(new Set(kode).size).toBe(kode.length);
  });

  it('awalan kode sepadan dengan tingkatnya', () => {
    // Awalan `kec_`/`kab_` adalah konvensi untuk pembaca data mentah, bukan
    // kontrak API -- tetapi konvensi yang dilanggar separuh lebih buruk
    // daripada yang tak pernah ada.
    for (const kategori of COMPLAINT_CATEGORIES) {
      const awalan = kategori.tingkat === TingkatPengaduan.kecamatan ? 'kec_' : 'kab_';
      expect(kategori.kode.startsWith(awalan)).toBe(true);
    }
  });

  it('menaruh "Lainnya" di posisi terakhir pada kedua tingkat', () => {
    // Dropdown memakai urutan daftar ini apa adanya.
    for (const tingkat of [TingkatPengaduan.kecamatan, TingkatPengaduan.kabupaten]) {
      const daftar = kategoriPengaduan(tingkat);
      expect(daftar[daftar.length - 1].nama).toBe('Lainnya');
    }
  });

  it('tidak lagi memuat kategori warisan aduan/lapor/lainnya', () => {
    // Migrasi 20261104090000_tingkat_pengaduan memetakan ketiganya ke
    // "Lainnya" pada tingkat masing-masing; menyisakannya di sini akan
    // membiarkan pengaduan baru lahir dengan kode yang sudah dipensiunkan.
    const kode = COMPLAINT_CATEGORIES.map((k) => k.kode);
    expect(kode).not.toContain('aduan');
    expect(kode).not.toContain('lapor');
    expect(kode).not.toContain('lainnya');
  });
});

describe('tingkatKategoriPengaduan', () => {
  it('mengembalikan tingkat pemilik kodenya', () => {
    expect(tingkatKategoriPengaduan('kec_sarana')).toBe(TingkatPengaduan.kecamatan);
    expect(tingkatKategoriPengaduan('kab_bencana')).toBe(TingkatPengaduan.kabupaten);
  });

  it('mengembalikan null untuk kode kosong, null, tak ada, atau tak dikenal', () => {
    expect(tingkatKategoriPengaduan('')).toBeNull();
    expect(tingkatKategoriPengaduan(null)).toBeNull();
    expect(tingkatKategoriPengaduan(undefined)).toBeNull();
    // Awalan yang BENAR pun ditolak bila kodenya tak ada di tabel: daftar
    // inilah kebenarannya, bukan awalannya.
    expect(tingkatKategoriPengaduan('kab_mengarang')).toBeNull();
  });
});
