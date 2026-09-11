import { BadRequestException } from '@nestjs/common';
import { SurveyStatus } from '@prisma/client';
import { assertSurveyEditable } from './survey-scope.util';

/**
 * Tabel aturan §2.4 spec. Tiap baris punya ujinya sendiri, TERMASUK yang
 * BOLEH: tanpa itu, aturan yang terlanjur terlalu ketat akan lolos tanpa ada
 * yang memerah.
 */
const draf = { status: SurveyStatus.draft, deletedAt: null };
const aktif = { status: SurveyStatus.aktif, deletedAt: null };
const ditutup = { status: SurveyStatus.ditutup, deletedAt: null };

describe('assertSurveyEditable', () => {
  it('draf: seluruh aksi boleh', () => {
    expect(() => assertSurveyEditable(draf, 0, 'meta')).not.toThrow();
    expect(() => assertSurveyEditable(draf, 0, 'periode')).not.toThrow();
    expect(() => assertSurveyEditable(draf, 0, 'susunan')).not.toThrow();
    expect(() => assertSurveyEditable(draf, 0, 'teks')).not.toThrow();
  });

  it('aktif tanpa jawaban: seluruh aksi boleh', () => {
    expect(() => assertSurveyEditable(aktif, 0, 'susunan')).not.toThrow();
    expect(() => assertSurveyEditable(aktif, 0, 'periode')).not.toThrow();
  });

  it('aktif dengan jawaban: susunan & periode ditolak', () => {
    expect(() => assertSurveyEditable(aktif, 142, 'susunan')).toThrow(BadRequestException);
    expect(() => assertSurveyEditable(aktif, 142, 'periode')).toThrow(BadRequestException);
  });

  it('aktif dengan jawaban: meta & perbaikan teks tetap boleh', () => {
    // Izin pengisian hanya mengatur pengisian berikutnya, dan salah ketik pada
    // pertanyaan terbaca setiap responden sesudahnya. Keduanya tak menggeser
    // satu pun nilai jawaban yang sudah masuk.
    expect(() => assertSurveyEditable(aktif, 142, 'meta')).not.toThrow();
    expect(() => assertSurveyEditable(aktif, 142, 'teks')).not.toThrow();
  });

  it('pesan galatnya menyebut jumlah jawaban, bukan sekadar "status tidak valid"', () => {
    expect(() => assertSurveyEditable(aktif, 142, 'susunan')).toThrow(/142/);
  });

  it('ditutup: seluruhnya terkunci, termasuk perbaikan teks', () => {
    // Snapshot IKM-nya sudah terbit. Mengubah isinya membuat angka yang sudah
    // dilaporkan tak dapat dipertanggungjawabkan.
    expect(() => assertSurveyEditable(ditutup, 0, 'meta')).toThrow(BadRequestException);
    expect(() => assertSurveyEditable(ditutup, 0, 'teks')).toThrow(BadRequestException);
  });

  it('survei di sampah tak dapat diubah sama sekali', () => {
    expect(() =>
      assertSurveyEditable({ status: SurveyStatus.draft, deletedAt: new Date() }, 0, 'meta'),
    ).toThrow(BadRequestException);
  });
});
