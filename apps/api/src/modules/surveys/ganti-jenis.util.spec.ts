import { BadRequestException } from '@nestjs/common';
import { JenisSurvei, SurveyStatus } from '@prisma/client';
import { assertBolehGantiJenis } from './ganti-jenis.util';

const { skm_permenpanrb: skm, custom } = JenisSurvei;

const survei = (over: Record<string, unknown> = {}) => ({
  jenis: skm,
  status: SurveyStatus.draft,
  deletedAt: null as Date | null,
  ...over,
});

describe('assertBolehGantiJenis', () => {
  it('lolos: SKM, draf, tanpa jawaban, tujuan custom', () => {
    expect(() => assertBolehGantiJenis(survei(), 0, custom)).not.toThrow();
  });

  it('survei di Sampah ditolak', () => {
    expect(() => assertBolehGantiJenis(survei({ deletedAt: new Date() }), 0, custom)).toThrow(
      /Sampah/,
    );
  });

  it('hanya boleh diganti MENJADI Custom', () => {
    expect(() => assertBolehGantiJenis(survei(), 0, skm)).toThrow(
      /hanya dapat diganti menjadi Custom/,
    );
  });

  it('survei yang sudah Custom ditolak', () => {
    expect(() => assertBolehGantiJenis(survei({ jenis: custom }), 0, custom)).toThrow(
      /sudah berjenis Custom/,
    );
  });

  it.each([SurveyStatus.aktif, SurveyStatus.ditutup])(
    'status %s ditolak, dengan jalan keluar menggandakan survei',
    (status) => {
      const panggil = () => assertBolehGantiJenis(survei({ status }), 0, custom);
      expect(panggil).toThrow(BadRequestException);
      expect(panggil).toThrow(/berstatus draf/);
      expect(panggil).toThrow(/Gandakan survei ini/);
    },
  );

  it('survei yang sudah dijawab ditolak dan pesannya menyebut jumlahnya', () => {
    expect(() => assertBolehGantiJenis(survei(), 3, custom)).toThrow(/sudah menerima 3 jawaban/);
  });

  it('urutan pemeriksaan: Sampah, lalu jenis tujuan, lalu sudah custom, lalu status, lalu jawaban', () => {
    const semua = survei({ jenis: custom, status: SurveyStatus.aktif, deletedAt: new Date() });
    expect(() => assertBolehGantiJenis(semua, 5, skm)).toThrow(/Sampah/);
    expect(() => assertBolehGantiJenis({ ...semua, deletedAt: null }, 5, skm)).toThrow(
      /hanya dapat diganti menjadi Custom/,
    );
    expect(() => assertBolehGantiJenis({ ...semua, deletedAt: null }, 5, custom)).toThrow(
      /sudah berjenis Custom/,
    );
    expect(() =>
      assertBolehGantiJenis({ ...semua, deletedAt: null, jenis: skm }, 5, custom),
    ).toThrow(/berstatus draf/);
    expect(() => assertBolehGantiJenis(survei({ status: SurveyStatus.draft }), 5, custom)).toThrow(
      /sudah menerima 5 jawaban/,
    );
  });
});
