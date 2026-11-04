import { angkaArgumen, bacaIsiTambahan, ringkasDataset } from './opsi-dataset';

describe('angkaArgumen', () => {
  it('memakai nilai baku bila argumennya tak ada', () => {
    expect(angkaArgumen(['node', 'skrip'], 'survei', 744)).toBe(744);
  });

  it('membaca nilai yang diberikan', () => {
    expect(angkaArgumen(['--survei=62'], 'survei', 744)).toBe(62);
  });

  it.each(['--survei=-1', '--survei=1.5', '--survei=abc', '--survei='])('menolak %s', (arg) => {
    expect(() => angkaArgumen([arg], 'survei', 744)).toThrow('--survei=');
  });
});

describe('bacaIsiTambahan', () => {
  /**
   * BAKUNYA NOL, dan itu inti pembandingnya. T1, T2, dan T3 di TEST_BEBAN.md
   * diukur tanpa jawaban teks dan tanpa pengaduan. Baku selain nol membuat
   * perintah yang sama membangun dataset yang berbeda dari yang tercatat, dan
   * selisih angkanya tak lagi dapat dibaca sebagai kemunduran.
   */
  it('tanpa argumen tidak menambah apa pun', () => {
    expect(bacaIsiTambahan([])).toEqual({ persenTeks: 0, pengaduanPerOpd: 0 });
  });

  it('membaca --teks= dan --pengaduan=', () => {
    expect(bacaIsiTambahan(['--teks=100', '--pengaduan=1000'])).toEqual({
      persenTeks: 100,
      pengaduanPerOpd: 1000,
    });
  });

  it('menolak persen di atas 100', () => {
    expect(() => bacaIsiTambahan(['--teks=101'])).toThrow('--teks=');
  });

  it('menolak jumlah pengaduan negatif', () => {
    expect(() => bacaIsiTambahan(['--pengaduan=-5'])).toThrow('--pengaduan=');
  });
});

describe('ringkasDataset', () => {
  /**
   * Angka beban hanya berarti bila ukuran datasetnya tercetak di sebelahnya.
   * Baris lama hanya menyebut respons dan jawaban, sehingga pengukuran dengan
   * dan tanpa pengaduan terbaca sama persis di catatan.
   */
  it('menyebut jawaban teks dan pengaduan', () => {
    expect(
      ringkasDataset({
        survey_responses: 148800,
        answers: 1488000,
        jawaban_teks: 148800,
        complaints: 62000,
      }),
    ).toBe('148.800 respons, 1.488.000 jawaban (148.800 teks), 62.000 pengaduan');
  });
});
