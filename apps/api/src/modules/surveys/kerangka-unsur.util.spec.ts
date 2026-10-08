import { BadRequestException } from '@nestjs/common';
import { JenisSurvei } from '@prisma/client';
import {
  assertBolehBuatPertanyaan,
  assertBolehHapusPertanyaan,
  assertBolehUbahPenandaUnsur,
  assertKerangkaLengkap,
  buatUnsurAwal,
  unsurHilang,
} from './kerangka-unsur.util';

const skm = { jenis: JenisSurvei.skm_permenpanrb };
const custom = { jenis: JenisSurvei.custom };
const unsurU1 = { isIkmUnsur: true, kodeUnsur: 'U1' };
const tambahan = { isIkmUnsur: false, kodeUnsur: null };
const semuaKode = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'];

describe('assertBolehHapusPertanyaan', () => {
  it('menolak menghapus pertanyaan unsur pada survei SKM', () => {
    expect(() => assertBolehHapusPertanyaan(skm, unsurU1)).toThrow(BadRequestException);
    expect(() => assertBolehHapusPertanyaan(skm, unsurU1)).toThrow(/unsur/i);
  });

  it('mengizinkan menghapus pertanyaan tambahan pada survei SKM', () => {
    expect(() => assertBolehHapusPertanyaan(skm, tambahan)).not.toThrow();
  });

  it('mengizinkan menghapus apa pun pada survei custom', () => {
    expect(() => assertBolehHapusPertanyaan(custom, unsurU1)).not.toThrow();
    expect(() => assertBolehHapusPertanyaan(custom, tambahan)).not.toThrow();
  });
});

describe('assertBolehBuatPertanyaan', () => {
  it.each([
    ['SKM', skm],
    ['custom', custom],
  ])('menolak pertanyaan ber-kodeUnsur pada survei %s', (_nama, survei) => {
    expect(() => assertBolehBuatPertanyaan(survei, { kodeUnsur: 'U1' })).toThrow(
      BadRequestException,
    );
  });

  it.each([
    ['SKM', skm],
    ['custom', custom],
  ])('menolak pertanyaan isIkmUnsur pada survei %s', (_nama, survei) => {
    expect(() => assertBolehBuatPertanyaan(survei, { isIkmUnsur: true })).toThrow(
      BadRequestException,
    );
  });

  it('mengizinkan pertanyaan tambahan biasa, juga dengan isIkmUnsur false', () => {
    expect(() => assertBolehBuatPertanyaan(skm, {})).not.toThrow();
    expect(() => assertBolehBuatPertanyaan(custom, { isIkmUnsur: false })).not.toThrow();
  });
});

describe('assertBolehUbahPenandaUnsur', () => {
  it('menolak mengubah kodeUnsur pertanyaan unsur pada survei SKM', () => {
    expect(() => assertBolehUbahPenandaUnsur(skm, unsurU1, { kodeUnsur: 'U2' })).toThrow(
      BadRequestException,
    );
  });

  it('menolak melepas tanda isIkmUnsur pertanyaan unsur pada survei SKM', () => {
    expect(() => assertBolehUbahPenandaUnsur(skm, unsurU1, { isIkmUnsur: false })).toThrow(
      BadRequestException,
    );
  });

  it('menolak menjadikan pertanyaan tambahan sebagai unsur pada survei SKM', () => {
    expect(() => assertBolehUbahPenandaUnsur(skm, tambahan, { isIkmUnsur: true })).toThrow(
      BadRequestException,
    );
    expect(() => assertBolehUbahPenandaUnsur(skm, tambahan, { kodeUnsur: 'U3' })).toThrow(
      BadRequestException,
    );
  });

  it('mengizinkan kiriman yang SAMA persis dengan nilai tersimpan (formulir mengirim semua medan)', () => {
    expect(() =>
      assertBolehUbahPenandaUnsur(skm, unsurU1, { kodeUnsur: 'U1', isIkmUnsur: true }),
    ).not.toThrow();
  });

  it('mengizinkan perubahan tanpa menyentuh penanda', () => {
    expect(() => assertBolehUbahPenandaUnsur(skm, unsurU1, {})).not.toThrow();
  });

  it('menolak menjadikan pertanyaan unsur pada survei custom', () => {
    expect(() => assertBolehUbahPenandaUnsur(custom, tambahan, { isIkmUnsur: true })).toThrow(
      BadRequestException,
    );
    expect(() => assertBolehUbahPenandaUnsur(custom, tambahan, { kodeUnsur: 'U1' })).toThrow(
      BadRequestException,
    );
  });
});

describe('unsurHilang', () => {
  it('mengembalikan kode U1-U9 yang tidak ada, berurutan', () => {
    expect(unsurHilang(['U1', 'U2'])).toEqual(['U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9']);
  });

  it('kosong bila kesembilannya ada, dan mengabaikan null serta kode asing', () => {
    expect(unsurHilang([...semuaKode, null, 'K1'])).toEqual([]);
  });

  it('semua kode hilang bila daftar kosong', () => {
    expect(unsurHilang([])).toEqual(semuaKode);
  });
});

describe('assertKerangkaLengkap', () => {
  it('menolak survei SKM yang kehilangan unsur dan menyebut kodenya', () => {
    const kurang = semuaKode.filter((k) => k !== 'U9');
    expect(() => assertKerangkaLengkap(skm, kurang)).toThrow(BadRequestException);
    expect(() => assertKerangkaLengkap(skm, kurang)).toThrow(/U9/);
  });

  it('menunjukkan jalan keluar: menggandakan survei untuk mendapatkan kerangka lengkap', () => {
    expect(() => assertKerangkaLengkap(skm, ['U1'])).toThrow(/gandakan/i);
  });

  it('menyebut semua kode yang hilang', () => {
    expect(() => assertKerangkaLengkap(skm, ['U1'])).toThrow(/U2.*U9/);
  });

  it('meloloskan survei SKM yang lengkap', () => {
    expect(() => assertKerangkaLengkap(skm, semuaKode)).not.toThrow();
  });

  it('tidak memeriksa apa pun pada survei custom', () => {
    expect(() => assertKerangkaLengkap(custom, [])).not.toThrow();
  });
});

describe('buatUnsurAwal', () => {
  it('menghasilkan sembilan pertanyaan skala berkode U1-U9 berurutan 1-9', () => {
    const baris = buatUnsurAwal();
    expect(baris).toHaveLength(9);
    expect(baris.map((b) => b.kodeUnsur)).toEqual(semuaKode);
    expect(baris.map((b) => b.urutan)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(baris.every((b) => b.tipe === 'skala' && b.isIkmUnsur === true)).toBe(true);
  });

  it('memakai nama unsur sebagai kalimat awal', () => {
    expect(buatUnsurAwal()[0].teks).toBe('Persyaratan');
  });
});
