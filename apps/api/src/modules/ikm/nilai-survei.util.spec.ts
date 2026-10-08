import { MetodeNilai, TujuanSurvei } from '@prisma/client';
import { hitungNilaiSurvei } from './nilai-survei.util';

const { kepuasan, evaluasi, penilaian } = TujuanSurvei;
const { rata_rata, indeks_persen } = MetodeNilai;

describe('hitungNilaiSurvei', () => {
  it('tanpa jawaban skala hasilnya null, bukan nol', () => {
    expect(hitungNilaiSurvei(null, kepuasan, rata_rata)).toBeNull();
    expect(hitungNilaiSurvei(null, evaluasi, indeks_persen)).toBeNull();
  });

  describe('metode rata_rata', () => {
    it('judul payung "Nilai Survei" untuk semua tujuan, angka dengan koma desimal', () => {
      expect(hitungNilaiSurvei(3.4, kepuasan, rata_rata)).toMatchObject({
        judul: 'Nilai Survei',
        nilai: 3.4,
        tampilan: '3,40 / 4',
        kategori: 'Sangat Puas',
      });
      expect(hitungNilaiSurvei(3.4, evaluasi, rata_rata)?.judul).toBe('Nilai Survei');
      expect(hitungNilaiSurvei(3.4, penilaian, rata_rata)?.judul).toBe('Nilai Survei');
    });

    it('selalu dua desimal', () => {
      expect(hitungNilaiSurvei(2.5, kepuasan, rata_rata)?.tampilan).toBe('2,50 / 4');
      expect(hitungNilaiSurvei(4, kepuasan, rata_rata)?.tampilan).toBe('4,00 / 4');
    });
  });

  describe('metode indeks_persen', () => {
    it('rata-rata dibagi 4, dalam persen, dengan nama menurut tujuan', () => {
      expect(hitungNilaiSurvei(3.4, kepuasan, indeks_persen)).toMatchObject({
        judul: 'Indeks Kepuasan',
        nilai: 85,
        tampilan: '85%',
        kategori: 'Sangat Puas',
      });
      expect(hitungNilaiSurvei(3.4, evaluasi, indeks_persen)?.judul).toBe('Indeks Evaluasi');
      expect(hitungNilaiSurvei(3.4, penilaian, indeks_persen)?.judul).toBe('Indeks Penilaian');
    });

    // Persen TIDAK dibulatkan ke bilangan bulat (temuan peninjauan 8 Oktober 2026):
    // rata-rata dua desimal x 25 selalu kelipatan 0,25, jadi persen penuh paling
    // banyak dua desimal. Dibulatkan ke bulat, 1,75 dan 1,76 sama-sama "44%" tetapi
    // berkategori beda -- angka yang tampil dan kategorinya tak lagi sependapat.
    it('persen tampil persis, hanya desimal yang perlu (nol di belakang dibuang)', () => {
      expect(hitungNilaiSurvei(3.33, kepuasan, indeks_persen)).toMatchObject({
        nilai: 83.25,
        tampilan: '83,25%',
      });
      expect(hitungNilaiSurvei(2.99, kepuasan, indeks_persen)?.tampilan).toBe('74,75%');
      expect(hitungNilaiSurvei(3.5, kepuasan, indeks_persen)?.tampilan).toBe('87,5%');
      expect(hitungNilaiSurvei(4, kepuasan, indeks_persen)?.tampilan).toBe('100%');
      expect(hitungNilaiSurvei(1, kepuasan, indeks_persen)?.tampilan).toBe('25%');
    });

    it('batas kategori jatuh pada persen 43,75 / 62,5 / 81,25 dan tampil persis', () => {
      const kata = (rata: number) => hitungNilaiSurvei(rata, kepuasan, indeks_persen);
      expect(kata(1.75)).toMatchObject({ tampilan: '43,75%', kategori: 'Tidak Puas' });
      expect(kata(1.76)).toMatchObject({ tampilan: '44%', kategori: 'Kurang Puas' });
      expect(kata(2.5)).toMatchObject({ tampilan: '62,5%', kategori: 'Kurang Puas' });
      expect(kata(2.51)).toMatchObject({ tampilan: '62,75%', kategori: 'Puas' });
      expect(kata(3.25)).toMatchObject({ tampilan: '81,25%', kategori: 'Puas' });
      expect(kata(3.26)).toMatchObject({ tampilan: '81,5%', kategori: 'Sangat Puas' });
    });

    it('angka yang sama TIDAK PERNAH berkategori beda, dan kategorinya sama dengan metode rata_rata', () => {
      const kategoriPerTampilan = new Map<string, string>();
      for (let sen = 100; sen <= 400; sen += 1) {
        const rata = sen / 100;
        const persen = hitungNilaiSurvei(rata, kepuasan, indeks_persen)!;
        const biasa = hitungNilaiSurvei(rata, kepuasan, rata_rata)!;
        expect(persen.kategori).toBe(biasa.kategori);
        const sebelumnya = kategoriPerTampilan.get(persen.tampilan);
        if (sebelumnya !== undefined) {
          expect(persen.kategori).toBe(sebelumnya);
        }
        kategoriPerTampilan.set(persen.tampilan, persen.kategori);
      }
    });
  });

  describe('kategori (batas atas inklusif, sama untuk semua OPD)', () => {
    const kamus: [TujuanSurvei, string[]][] = [
      [kepuasan, ['Tidak Puas', 'Kurang Puas', 'Puas', 'Sangat Puas']],
      [evaluasi, ['Kurang', 'Cukup', 'Baik', 'Sangat Baik']],
      [penilaian, ['Kurang', 'Cukup', 'Baik', 'Sangat Baik']],
    ];

    // [rata-rata, indeks kategori 0..3]
    const batas: [number, number][] = [
      [1, 0],
      [1.75, 0],
      [1.76, 1],
      [2.5, 1],
      [2.51, 2],
      [3.25, 2],
      [3.26, 3],
      [4, 3],
    ];

    for (const [tujuan, kata] of kamus) {
      it(`tujuan ${tujuan}: batas tepat pada 1,75 / 2,50 / 3,25`, () => {
        for (const [rata, idx] of batas) {
          expect(hitungNilaiSurvei(rata, tujuan, rata_rata)?.kategori).toBe(kata[idx]);
        }
      });
    }

    it('dibulatkan 2 desimal SEBELUM memilih kategori: 1,749 -> 1,75 -> kategori terendah', () => {
      const hasil = hitungNilaiSurvei(1.749, kepuasan, rata_rata);
      expect(hasil?.kategori).toBe('Tidak Puas');
      expect(hasil?.tampilan).toBe('1,75 / 4');
    });

    it('1,751 dibulatkan menjadi 1,75 (masih kategori terendah), 1,755 menjadi 1,76', () => {
      expect(hitungNilaiSurvei(1.751, kepuasan, rata_rata)?.kategori).toBe('Tidak Puas');
      expect(hitungNilaiSurvei(1.756, kepuasan, rata_rata)?.kategori).toBe('Kurang Puas');
    });
  });

  describe('data menyimpang', () => {
    it('rata-rata di luar 1-4 dijepit ke batas, persen tak pernah lewat 100', () => {
      expect(hitungNilaiSurvei(4.6, kepuasan, indeks_persen)).toMatchObject({
        nilai: 100,
        tampilan: '100%',
        kategori: 'Sangat Puas',
      });
      expect(hitungNilaiSurvei(0.5, kepuasan, rata_rata)).toMatchObject({
        nilai: 1,
        tampilan: '1,00 / 4',
        kategori: 'Tidak Puas',
      });
    });
  });

  describe('tujuan / metode kosong (baris lama dan fixture)', () => {
    it('dibaca sebagai bawaan: kepuasan + rata_rata', () => {
      expect(hitungNilaiSurvei(3.4, null, null)).toMatchObject({
        judul: 'Nilai Survei',
        tampilan: '3,40 / 4',
        kategori: 'Sangat Puas',
      });
    });

    it('hanya metode kosong: tujuan dipakai, metode bawaan', () => {
      expect(hitungNilaiSurvei(3.4, evaluasi, null)).toMatchObject({
        judul: 'Nilai Survei',
        kategori: 'Sangat Baik',
      });
    });

    it('hanya tujuan kosong: metode dipakai, tujuan bawaan kepuasan', () => {
      expect(hitungNilaiSurvei(3.4, null, indeks_persen)?.judul).toBe('Indeks Kepuasan');
    });
  });
});
