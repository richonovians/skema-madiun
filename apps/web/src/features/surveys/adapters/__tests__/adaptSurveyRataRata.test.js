import { adaptSurvey, adaptSurveyList } from '../survey.adapter';

/**
 * `GET /surveys` dan `GET /surveys/:id` kini membawa `nilaiRataRata` (7 Oktober
 * 2026): rata-rata SEMUA jawaban skala 1-4 pada survei, BUKAN IKM. Adapter
 * menerjemahkannya ke `averageScore`, yang dibaca tabel survei Admin Kabupaten
 * dan kartu ringkasan halaman respons.
 *
 * Namanya sama dengan `averageScore` per RESPONS di `adaptSurveyResponse`
 * dengan sengaja: definisinya sama, jadi angka survei memang agregat dari
 * angka-angka per respons.
 */
const entity = (over = {}) => ({
  id: 7,
  opdId: 1,
  judul: 'Survei Uji',
  periode: '2026-Q2',
  status: 'aktif',
  respondentsCount: 5,
  nilaiIkm: null,
  nilaiRataRata: 3.84,
  ...over,
});

describe('adaptSurvey — nilai rata-rata', () => {
  it('meneruskan nilaiRataRata sebagai averageScore', () => {
    expect(adaptSurvey(entity()).averageScore).toBe(3.84);
  });

  it('terisi walau IKM null (survei tanpa 9 unsur baku)', () => {
    const hasil = adaptSurvey(entity({ nilaiIkm: null, nilaiRataRata: 3.13 }));

    expect(hasil.ikmScore).toBeNull();
    expect(hasil.averageScore).toBe(3.13);
  });

  it('null dipertahankan, bukan diubah menjadi 0', () => {
    expect(adaptSurvey(entity({ nilaiRataRata: null })).averageScore).toBeNull();
  });

  it('respons yang tak membawa kuncinya (mis. /surveys/active) menjadi null, bukan undefined', () => {
    const { nilaiRataRata, ...tanpaKunci } = entity();
    void nilaiRataRata;

    expect(adaptSurvey(tanpaKunci).averageScore).toBeNull();
  });

  it('daftar: tiap baris membawa nilainya sendiri', () => {
    const hasil = adaptSurveyList([
      entity({ id: 1, nilaiRataRata: 3.5 }),
      entity({ id: 2, nilaiRataRata: null }),
    ]);

    expect(hasil.map((s) => s.averageScore)).toEqual([3.5, null]);
  });

  it('KONTROL: ikmScore tetap dari nilaiIkm, tak ikut tergeser', () => {
    expect(adaptSurvey(entity({ nilaiIkm: 81.25 })).ikmScore).toBe(81.25);
  });
});
