import { BadRequestException } from '@nestjs/common';
import { parseTanggalKejadian } from './tanggal-kejadian.util';

// 4 November 2026 pukul 10.00 UTC = 17.00 WIB. Dipaku supaya uji "masa depan"
// tak bergantung pada jam mesin yang menjalankannya.
const SEKARANG = new Date('2026-11-04T10:00:00.000Z');

describe('parseTanggalKejadian', () => {
  it('menghasilkan tengah malam UTC, bukan tengah malam waktu server', () => {
    // Inilah cacat yang dijaga: pada server berzona WIB, tengah malam lokal
    // tersimpan sebagai pukul 17.00 hari SEBELUMNYA di kolom DATE.
    const hasil = parseTanggalKejadian('2026-11-01', SEKARANG);

    expect(hasil.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('menerima tanggal hari ini', () => {
    expect(parseTanggalKejadian('2026-11-04', SEKARANG).toISOString()).toBe(
      '2026-11-04T00:00:00.000Z',
    );
  });

  it('menerima tanggal hari ini menurut WIB meski server masih di tanggal sebelumnya', () => {
    // Pukul 01.00 WIB 5 November = 18.00 UTC 4 November. Warga yang melapor
    // dini hari memilih "5 November" di kalendernya, dan menolaknya karena jam
    // server masih 4 November adalah penolakan yang tak dapat ia pahami.
    const dinihariWib = new Date('2026-11-04T18:00:00.000Z');

    expect(parseTanggalKejadian('2026-11-05', dinihariWib).toISOString()).toBe(
      '2026-11-05T00:00:00.000Z',
    );
  });

  it('menolak tanggal di masa depan', () => {
    expect(() => parseTanggalKejadian('2026-11-05', SEKARANG)).toThrow(BadRequestException);
    expect(() => parseTanggalKejadian('2099-01-01', SEKARANG)).toThrow(
      /tidak boleh melampaui hari ini/,
    );
  });

  it('menolak tanggal yang tidak ada dalam kalender', () => {
    // `new Date('2026-02-31')` menggulungnya DIAM-DIAM menjadi 3 Maret.
    // Tanpa pembandingan ulang, tanggal yang tersimpan bukan yang diketik.
    expect(() => parseTanggalKejadian('2026-02-31', SEKARANG)).toThrow(/tidak ada dalam kalender/);
    expect(() => parseTanggalKejadian('2026-04-31', SEKARANG)).toThrow(BadRequestException);
    expect(() => parseTanggalKejadian('2026-13-01', SEKARANG)).toThrow(BadRequestException);
    expect(() => parseTanggalKejadian('2026-00-10', SEKARANG)).toThrow(BadRequestException);
  });

  it('menerima 29 Februari pada tahun kabisat, menolaknya pada tahun biasa', () => {
    expect(parseTanggalKejadian('2024-02-29', SEKARANG).toISOString()).toBe(
      '2024-02-29T00:00:00.000Z',
    );
    expect(() => parseTanggalKejadian('2026-02-29', SEKARANG)).toThrow(/tidak ada dalam kalender/);
  });

  it('menolak bentuk yang bukan YYYY-MM-DD', () => {
    for (const teks of ['01-11-2026', '2026/11/01', '2026-1-1', '', 'kemarin']) {
      expect(() => parseTanggalKejadian(teks, SEKARANG)).toThrow(/berformat YYYY-MM-DD/);
    }
  });

  it('mengabaikan spasi di tepi', () => {
    expect(parseTanggalKejadian('  2026-11-01  ', SEKARANG).toISOString()).toBe(
      '2026-11-01T00:00:00.000Z',
    );
  });
});
