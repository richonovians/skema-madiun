import { TingkatPengaduan } from '@prisma/client';
import { tingkatOpd } from './tingkat-opd.util';

describe('tingkatOpd', () => {
  it('membaca kecamatan dari awalan namanya', () => {
    expect(tingkatOpd('Kecamatan Geger')).toBe(TingkatPengaduan.kecamatan);
    expect(tingkatOpd('Kecamatan Pilangkenceng')).toBe(TingkatPengaduan.kecamatan);
  });

  it('memperlakukan kelurahan sebagai tingkat kecamatan', () => {
    // Keputusan pengguna 4 November 2026 -- lihat docblock utilitasnya.
    expect(tingkatOpd('Kelurahan Krajan')).toBe(TingkatPengaduan.kecamatan);
    expect(tingkatOpd('Kelurahan Bangunsari (Dolopo)')).toBe(TingkatPengaduan.kecamatan);
  });

  it('tidak peduli besar-kecil huruf', () => {
    // Nama OPD sungguhan datang campur: 9 baris "BAGIAN ..." seluruhnya
    // kapital, sisanya Title Case. Helpdesk tak menjanjikan satu pun bentuk.
    expect(tingkatOpd('KECAMATAN WUNGU')).toBe(TingkatPengaduan.kecamatan);
    expect(tingkatOpd('kecamatan wungu')).toBe(TingkatPengaduan.kecamatan);
  });

  it('menganggap sisanya tingkat kabupaten', () => {
    expect(tingkatOpd('Dinas Kesehatan')).toBe(TingkatPengaduan.kabupaten);
    expect(tingkatOpd('BAGIAN HUKUM')).toBe(TingkatPengaduan.kabupaten);
    expect(tingkatOpd('Sekretariat Daerah')).toBe(TingkatPengaduan.kabupaten);
  });

  it('tidak tertipu nama yang hanya MEMUAT kata kecamatan', () => {
    // Pencocokannya diikat ke awal nama. Tanpa itu, OPD mana pun yang
    // menyebut kecamatan di tengah namanya ikut tersaring ke tingkat yang
    // salah -- dan di tingkat kabupaten ia justru menghilang dari daftar.
    expect(tingkatOpd('Dinas Pemberdayaan Masyarakat dan Kecamatan')).toBe(
      TingkatPengaduan.kabupaten,
    );
    expect(tingkatOpd('Kecamatanisasi Wilayah')).toBe(TingkatPengaduan.kabupaten);
  });

  it('memperlakukan nama kosong, null, dan tak ada sebagai kabupaten', () => {
    // Gagal ke arah yang paling longgar: tingkat kabupaten menerima seluruh
    // 21 kategori, jadi kesalahan klasifikasi di sini tak pernah membuat
    // sebuah OPD kehilangan tempat sama sekali.
    expect(tingkatOpd('')).toBe(TingkatPengaduan.kabupaten);
    expect(tingkatOpd(null)).toBe(TingkatPengaduan.kabupaten);
    expect(tingkatOpd(undefined)).toBe(TingkatPengaduan.kabupaten);
  });
});
