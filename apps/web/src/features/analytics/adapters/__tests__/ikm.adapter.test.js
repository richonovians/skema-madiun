import { adaptIkmMetrics } from '../ikm.adapter';

/**
 * `GET /surveys/:id/results` kini membawa `nilaiRataRata` (7 Oktober 2026):
 * rata-rata SEMUA jawaban skala 1-4, BUKAN IKM. Adapter menerjemahkannya ke
 * `metrics.averageScore.value`, dan kartunya di SkmAnalysisView membacanya dari
 * sana.
 */
const hasil = (over = {}) => ({
  surveyId: 1,
  jumlahResponden: 5,
  nilaiIkm: 80,
  mutu: 'B',
  nilaiRataRata: 3.2,
  ...over,
});

describe('adaptIkmMetrics — nilai rata-rata', () => {
  it('meneruskan nilaiRataRata ke metrics.averageScore.value', () => {
    expect(adaptIkmMetrics(hasil({ nilaiRataRata: 3.84 })).averageScore.value).toBe(3.84);
  });

  it('tetap terisi saat IKM null (survei tanpa 9 unsur baku)', () => {
    const metrics = adaptIkmMetrics(hasil({ nilaiIkm: null, mutu: null, nilaiRataRata: 3.13 }));

    expect(metrics.ikm.value).toBeNull();
    expect(metrics.averageScore.value).toBe(3.13);
  });

  it('null dipertahankan sebagai null, bukan diubah menjadi 0', () => {
    expect(adaptIkmMetrics(hasil({ nilaiRataRata: null })).averageScore.value).toBeNull();
  });

  it('respons yang tak membawa kuncinya (backend lama) menjadi null, bukan undefined', () => {
    // `undefined` yang lolos menyeberang ke komponen sebagai nilai bertipe tak
    // menentukan, dan `.toFixed` di atasnya melempar galat.
    const { nilaiRataRata, ...tanpaKunci } = hasil();
    void nilaiRataRata;

    expect(adaptIkmMetrics(tanpaKunci).averageScore.value).toBeNull();
  });

  it('tidak mengubah angka yang sudah ada: ikm & responden tetap dari field aslinya', () => {
    // KONTROL: menambah kunci baru tak boleh menggeser yang lama.
    const metrics = adaptIkmMetrics(hasil({ nilaiIkm: 77.78, jumlahResponden: 9 }));

    expect(metrics.ikm.value).toBe(77.78);
    expect(metrics.totalRespondents.value).toBe(9);
  });
});
