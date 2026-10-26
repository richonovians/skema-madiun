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

  /**
   * DUA ARAH sejak 26 Oktober 2026 (permintaan pengguna). Sampai hari itu hanya
   * SKM -> Custom yang diterima, dan uji di tempat ini menuntut penolakan
   * "hanya dapat diganti menjadi Custom". Custom -> SKM kini lolos dengan
   * syarat yang sama persis: draf, belum dijawab, tidak di Sampah.
   */
  it('lolos: Custom, draf, tanpa jawaban, tujuan SKM', () => {
    expect(() => assertBolehGantiJenis(survei({ jenis: custom }), 0, skm)).not.toThrow();
  });

  it('survei yang sudah SKM ditolak bila tujuannya SKM', () => {
    expect(() => assertBolehGantiJenis(survei(), 0, skm)).toThrow(/sudah berjenis SKM/);
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

  it('urutan pemeriksaan: Sampah, lalu jenis yang sama, lalu status, lalu jawaban', () => {
    const semua = survei({ jenis: custom, status: SurveyStatus.aktif, deletedAt: new Date() });
    expect(() => assertBolehGantiJenis(semua, 5, custom)).toThrow(/Sampah/);
    expect(() => assertBolehGantiJenis({ ...semua, deletedAt: null }, 5, custom)).toThrow(
      /sudah berjenis Custom/,
    );
    expect(() => assertBolehGantiJenis({ ...semua, deletedAt: null }, 5, skm)).toThrow(
      /berstatus draf/,
    );
    expect(() =>
      assertBolehGantiJenis({ ...semua, deletedAt: null, status: SurveyStatus.draft }, 5, skm),
    ).toThrow(/sudah menerima 5 jawaban/);
  });

  it.each([SurveyStatus.aktif, SurveyStatus.ditutup])(
    'arah Custom -> SKM: status %s ditolak dengan pesan yang sama',
    (status) => {
      expect(() => assertBolehGantiJenis(survei({ jenis: custom, status }), 0, skm)).toThrow(
        /berstatus draf/,
      );
    },
  );

  it('arah Custom -> SKM: survei yang sudah dijawab ditolak', () => {
    expect(() => assertBolehGantiJenis(survei({ jenis: custom }), 2, skm)).toThrow(
      /sudah menerima 2 jawaban/,
    );
  });
});
