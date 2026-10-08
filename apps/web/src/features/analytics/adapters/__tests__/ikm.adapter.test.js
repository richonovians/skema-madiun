import { adaptIkmMetrics, adaptSebaranSkor } from '../ikm.adapter';

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

/**
 * `GET /surveys/:id/results` kini membawa `sebaranSkor` (8 Oktober 2026): berapa
 * responden memilih tiap nilai 1-4 PADA TIAP pertanyaan skala. Adapter
 * menerjemahkannya ke bentuk yang dipakai kartu "Distribusi Skor": label
 * ramah-baca dan persentase eksak (lebar segmen bilah).
 */
const sebaran = (jumlah) =>
  jumlah.map((j, i) => ({ nilai: i + 1, jumlah: j }));

const butir = (over = {}) => ({
  pertanyaanId: 10,
  kodeUnsur: 'U1',
  teks: 'Persyaratan pelayanan',
  total: 4,
  sebaran: sebaran([0, 1, 1, 2]),
  ...over,
});

describe('adaptSebaranSkor', () => {
  it('menerjemahkan butir ke bentuk komponen: id, kode, teks, total, dan empat nilai berlabel', () => {
    const [hasil] = adaptSebaranSkor([butir()]);

    expect(hasil).toMatchObject({ id: 10, kode: 'U1', teks: 'Persyaratan pelayanan', total: 4 });
    expect(hasil.nilai.map((n) => [n.nilai, n.label, n.jumlah])).toEqual([
      [1, 'Buruk', 0],
      [2, 'Kurang', 1],
      [3, 'Baik', 1],
      [4, 'Sangat Baik', 2],
    ]);
  });

  it('persentase EKSAK (jumlah / total * 100), bukan dibulatkan: ia menjadi lebar segmen bilah', () => {
    // Dibulatkan di sini, ketiga segmen 1/3 berjumlah 99% dan bilahnya tak penuh.
    const [hasil] = adaptSebaranSkor([butir({ total: 3, sebaran: sebaran([1, 1, 1, 0]) })]);

    expect(hasil.nilai[0].persen).toBeCloseTo(33.3333, 3);
    expect(hasil.nilai.reduce((acc, n) => acc + n.persen, 0)).toBeCloseTo(100, 10);
  });

  it('total 0 -> persentase 0, BUKAN NaN (pembagian dengan nol)', () => {
    const [hasil] = adaptSebaranSkor([butir({ total: 0, sebaran: sebaran([0, 0, 0, 0]) })]);

    expect(hasil.nilai.map((n) => n.persen)).toEqual([0, 0, 0, 0]);
  });

  it('pertanyaan tambahan (kodeUnsur null) membawa kode null, bukan string kosong', () => {
    const [hasil] = adaptSebaranSkor([butir({ kodeUnsur: null })]);

    expect(hasil.kode).toBeNull();
  });

  it('urutan dari backend dipertahankan', () => {
    const hasil = adaptSebaranSkor([
      butir({ pertanyaanId: 3 }),
      butir({ pertanyaanId: 1 }),
      butir({ pertanyaanId: 2 }),
    ]);

    expect(hasil.map((h) => h.id)).toEqual([3, 1, 2]);
  });

  it('larik kosong tetap larik kosong: survei tanpa pertanyaan skala', () => {
    expect(adaptSebaranSkor([])).toEqual([]);
  });

  it.each([[undefined], [null]])(
    'respons yang tak membawa kuncinya (%s) menjadi undefined, BUKAN larik kosong',
    (masukan) => {
      // Dua keadaan berbeda bagi tampilan: "backend belum mengirimnya" tak boleh
      // terbaca sebagai "survei ini tak punya pertanyaan skala".
      expect(adaptSebaranSkor(masukan)).toBeUndefined();
    },
  );
});
