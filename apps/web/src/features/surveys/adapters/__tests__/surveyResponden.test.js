import { adaptSurveyResponse } from '../survey.adapter';

/**
 * DATA DIRI PENGISI PADA RESPONS SURVEI (1 Oktober 2026, laporan pengguna:
 * "data responden bukan anonim belum tampil ketika menjawab survei").
 *
 * Keempat kolomnya sudah tersimpan di `survey_responses` sejak 8 September
 * 2026, tetapi `ResponseEntity` backend hanya memuat id/surveyId/submittedAt --
 * catatan di schema.prisma menyebutnya tersurat: "BELUM ADA PEMBACANYA".
 * Backend membukanya pada tanggal yang sama dengan berkas ini; adapter inilah
 * pembaca pertamanya di sisi layar.
 *
 * YANG DIJAGA DI SINI adalah pembedaan antara DUA KEADAAN yang sangat mudah
 * tertukar dan akibatnya jauh berbeda:
 *
 *   - pengisi MEMILIH anonim          -> keempatnya null
 *   - pengisi memberi data            -> terisi apa adanya
 *
 * Menyamakan keduanya, misalnya dengan mengganti null menjadi '-' di adapter,
 * membuat orang yang memilih tidak memberi datanya tak dapat dibedakan dari
 * data yang hilang. Itu bukan soal rapi-rapian tampilan: ia menghapus jejak
 * sebuah pilihan yang dijamin kepada pengisinya.
 */
const pertanyaan = [{ id: 1, type: 'scale_1_to_4', text: 'Soal', urutan: 1 }];

const respons = (tambahan = {}) => ({
  id: 9,
  surveyId: 3,
  submittedAt: '2026-10-01T00:00:00.000Z',
  answers: [],
  ...tambahan,
});

describe('adaptSurveyResponse — data diri pengisi', () => {
  it('meneruskan data diri yang diberikan pengisi', () => {
    const hasil = adaptSurveyResponse(
      respons({
        nama: 'Siti Aminah',
        nomorHp: '081234567890',
        jenisKelamin: 'perempuan',
        kelompokUmur: '26-35',
      }),
      pertanyaan,
    );

    expect(hasil.respondent).toEqual({
      name: 'Siti Aminah',
      phone: '081234567890',
      gender: 'perempuan',
      ageGroup: '26-35',
      isAnonim: false,
    });
  });

  it('pengisi anonim ditandai, dan medannya TETAP null', () => {
    // `isAnonim` ada supaya layar tak perlu menebak dari gabungan medan kosong,
    // dan null-nya dipertahankan supaya layar yang memilih menampilkan '-'
    // melakukannya sebagai keputusan tampilan, bukan mewarisi karangan adapter.
    const hasil = adaptSurveyResponse(
      respons({ nama: null, nomorHp: null, jenisKelamin: null, kelompokUmur: null }),
      pertanyaan,
    );

    expect(hasil.respondent).toEqual({
      name: null,
      phone: null,
      gender: null,
      ageGroup: null,
      isAnonim: true,
    });
  });

  it('nomor HP ada tanpa nama tetap BUKAN anonim', () => {
    // Keadaan nyata pada jalur bersesi: akun yang tak ditemukan membuat `nama`
    // null, sementara nomor HP yang diketik pengisi tetap tersimpan. Menyebut
    // baris ini "anonim" akan mengklaim sebuah pilihan yang tak pernah diambil.
    const hasil = adaptSurveyResponse(respons({ nomorHp: '081234567890' }), pertanyaan);

    expect(hasil.respondent.isAnonim).toBe(false);
    expect(hasil.respondent.phone).toBe('081234567890');
  });

  it('jawaban backend lama tanpa medan ini tidak meledak', () => {
    // Respons yang sudah tersimpan sebelum 8 September 2026 tak punya keempat
    // kolomnya sama sekali.
    const hasil = adaptSurveyResponse(respons(), pertanyaan);

    expect(hasil.respondent.isAnonim).toBe(true);
    expect(hasil.respondent.name).toBeNull();
  });

  it('KONTROL: bagian jawaban tidak terganggu', () => {
    // Tanpa ini, memecah bentuk kembalian adapter saat menambahkan `respondent`
    // tak akan memerahkan satu pun uji di berkas ini.
    const hasil = adaptSurveyResponse(respons({ nama: 'Budi' }), pertanyaan);

    expect(hasil.id).toBe(9);
    expect(hasil.surveyId).toBe(3);
    expect(hasil.answers).toEqual([]);
  });
});
