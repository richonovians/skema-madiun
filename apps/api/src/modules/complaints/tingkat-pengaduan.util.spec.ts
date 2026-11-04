import { BadRequestException } from '@nestjs/common';
import { TingkatPengaduan } from '@prisma/client';
import { COMPLAINT_CATEGORIES } from '../reference/reference.constants';
import { assertKategoriSesuaiTingkat, assertOpdSesuaiTingkat } from './tingkat-pengaduan.util';

describe('assertKategoriSesuaiTingkat', () => {
  it('meloloskan setiap kategori pada tingkatnya sendiri', () => {
    // Seluruh 29 kategori, bukan contoh pilihan: daftar inilah kontraknya, dan
    // satu baris yang salah awalan akan lolos uji berbasis contoh.
    for (const kategori of COMPLAINT_CATEGORIES) {
      expect(() => assertKategoriSesuaiTingkat(kategori.kode, kategori.tingkat)).not.toThrow();
    }
  });

  it('menolak kategori kecamatan pada pengaduan kabupaten', () => {
    expect(() =>
      assertKategoriSesuaiTingkat('kec_administrasi', TingkatPengaduan.kabupaten),
    ).toThrow(BadRequestException);
    expect(() =>
      assertKategoriSesuaiTingkat('kec_administrasi', TingkatPengaduan.kabupaten),
    ).toThrow(/tingkat kecamatan/);
  });

  it('menolak kategori kabupaten pada pengaduan kecamatan', () => {
    expect(() => assertKategoriSesuaiTingkat('kab_kesehatan', TingkatPengaduan.kecamatan)).toThrow(
      /tingkat kabupaten/,
    );
  });

  it('memisahkan dua "Lainnya" yang berbeda tingkat', () => {
    // Keduanya bernama sama di layar; kodenya sengaja berbeda supaya tingkatnya
    // tetap dapat dibedakan di data mentah maupun di penyaring laporan.
    expect(() =>
      assertKategoriSesuaiTingkat('kec_lainnya', TingkatPengaduan.kecamatan),
    ).not.toThrow();
    expect(() => assertKategoriSesuaiTingkat('kec_lainnya', TingkatPengaduan.kabupaten)).toThrow();
    expect(() =>
      assertKategoriSesuaiTingkat('kab_lainnya', TingkatPengaduan.kabupaten),
    ).not.toThrow();
    expect(() => assertKategoriSesuaiTingkat('kab_lainnya', TingkatPengaduan.kecamatan)).toThrow();
  });

  it('menolak kode yang tak dikenal dengan pesan yang BERBEDA', () => {
    // "tidak dikenal" dan "salah tingkat" menuntut perbaikan berbeda dari
    // pengirimnya; satu pesan untuk keduanya menyembunyikan yang mana.
    expect(() => assertKategoriSesuaiTingkat('kab_mengarang', TingkatPengaduan.kabupaten)).toThrow(
      /tidak dikenal/,
    );
    // Kategori warisan yang dibuang 4 November 2026 jatuh ke cabang yang sama.
    expect(() => assertKategoriSesuaiTingkat('aduan', TingkatPengaduan.kabupaten)).toThrow(
      /tidak dikenal/,
    );
  });
});

describe('assertOpdSesuaiTingkat', () => {
  it('meloloskan kecamatan & kelurahan pada pengaduan kecamatan', () => {
    expect(() =>
      assertOpdSesuaiTingkat('Kecamatan Geger', TingkatPengaduan.kecamatan),
    ).not.toThrow();
    expect(() =>
      assertOpdSesuaiTingkat('Kelurahan Krajan', TingkatPengaduan.kecamatan),
    ).not.toThrow();
  });

  it('meloloskan dinas pada pengaduan kabupaten', () => {
    expect(() =>
      assertOpdSesuaiTingkat('Dinas Kesehatan', TingkatPengaduan.kabupaten),
    ).not.toThrow();
  });

  it('menolak kecamatan sebagai tujuan pengaduan kabupaten', () => {
    expect(() => assertOpdSesuaiTingkat('Kecamatan Wungu', TingkatPengaduan.kabupaten)).toThrow(
      BadRequestException,
    );
  });

  it('menolak dinas sebagai tujuan pengaduan kecamatan', () => {
    // Penjaga sisi SERVER. Dropdown di peramban sudah menyaringnya, tetapi
    // siapa pun dapat mengirim multipart-nya sendiri -- dan hasil tanpa
    // penjaga ini adalah tiket tingkat kecamatan di meja Dinas Kesehatan
    // dengan kategori "Pelayanan Administrasi Kecamatan".
    expect(() => assertOpdSesuaiTingkat('Dinas Kesehatan', TingkatPengaduan.kecamatan)).toThrow(
      /tingkat kabupaten/,
    );
  });

  it('menyebut nama instansinya di pesan galat', () => {
    expect(() => assertOpdSesuaiTingkat('Kecamatan Dolopo', TingkatPengaduan.kabupaten)).toThrow(
      /Kecamatan Dolopo/,
    );
  });
});
