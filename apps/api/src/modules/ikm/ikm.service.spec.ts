import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IkmMutu, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PenyimpanSinggahan } from '../../common/cache/penyimpan-singgahan.interface';
import { PenyimpanSinggahanNonaktif } from '../../common/cache/penyimpan-singgahan.nonaktif';
import { PrismaService } from '../../prisma/prisma.service';
import type { IkmExportService } from './ikm-export.service';
import { IkmService } from './ikm.service';
import { IkmUnsurEntity } from './entities/ikm-result.entity';
import {
  AWALAN_DASHBOARD,
  KUNCI_GENERASI_DASHBOARD,
  kunciSinggahanDashboardIkm,
  kunciSinggahanIkm,
} from './singgahan-ikm.util';

const opdUser = (opdId: number | null): CurrentUser => ({
  userId: 1,
  roles: [Role.opd],
  actingRole: Role.opd,
  opdId,
});
const kabupatenUser = (): CurrentUser => ({
  userId: 2,
  roles: [Role.kabupaten],
  actingRole: Role.kabupaten,
  opdId: null,
});

const survey = (over: Record<string, unknown> = {}) => ({
  id: 1,
  opdId: 5,
  periode: '2026',
  ...over,
});

// 9 unsur, semua responden menilai 4 → NRR=4 tiap unsur, IKM = 4*25=100 → mutu A.
const unsurQuestions = (nilai: number[][]) =>
  nilai.map((nilaiList, i) => ({
    id: i + 1,
    kodeUnsur: `U${i + 1}`,
    teks: `Unsur ${i + 1}`,
    answers: nilaiList.map((n) => ({ nilai: n })),
  }));

const dashboardRow = (over: Record<string, unknown> = {}) => ({
  id: 1,
  surveyId: 10,
  periode: '2026',
  nilaiIkm: 90,
  mutu: IkmMutu.A,
  jumlahResponden: 5,
  survey: {
    id: 10,
    opdId: 1,
    judul: 'Survei Dinkes',
    opd: { id: 1, nama: 'Dinas Kesehatan', jenisLayanan: 'Kesehatan' },
  },
  ...over,
});

describe('IkmService', () => {
  const prisma = {
    // `findMany` default [] -- getDashboard (2026-08-05) ikut query survei
    // `aktif` utk live-compute; tes yg tak peduli survei aktif tak perlu tahu ini.
    survey: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    question: { findMany: jest.fn() },
    // Bawaannya "belum ada jawaban skala": tes yang tak peduli rata-rata tak
    // perlu tahu. `clearAllMocks` tak menghapus implementasi, jadi tes yang
    // mengubahnya WAJIB memakai `...Once` supaya tak bocor ke tes berikutnya.
    answer: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { nilai: null } }),
      // Bawaan "tak ada jawaban": tes yang tak peduli sebaran tak perlu tahu.
      groupBy: jest.fn().mockResolvedValue([]),
    },
    surveyResponse: { count: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
    ikmResult: { upsert: jest.fn(), findMany: jest.fn() },
    complaint: { count: jest.fn().mockResolvedValue(0) },
    opd: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;
  const ikmExportService = {
    buildFilename: jest.fn().mockReturnValue('hasil-ikm-1-2026.csv'),
    toCsv: jest.fn().mockReturnValue(Buffer.from('csv-content')),
    toExcel: jest.fn().mockResolvedValue(Buffer.from('excel-content')),
    toPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
  } as unknown as IkmExportService;
  // Singgahan NONAKTIF untuk seluruh uji lama: ia selalu meleset, jadi
  // perilakunya persis seperti sebelum singgahan ada dan tak satu pun uji
  // lama berubah artinya.
  const service = new IkmService(prisma, ikmExportService, new PenyimpanSinggahanNonaktif());

  beforeEach(() => jest.clearAllMocks());

  /**
   * Bentuk mock untuk JALUR BATCH yang kini dipakai `getDashboard` atas survei
   * aktif. Sebelum 13 Oktober 2026 jalur itu memanggil `computeResult` sekali
   * per survei, sehingga uji di bawah cukup memberi `unsurQuestions` (yang
   * membawa `answers`) plus `surveyResponse.count`. Jalur batch tak menarik
   * baris jawaban sama sekali -- itu justru inti perbaikannya -- jadi mocknya
   * harus tiga agregat. Matriks `nilai` dan angka harapan tiap uji TIDAK
   * berubah; hanya bentuk kueri yang dimock.
   *
   * Kedua `groupBy` dipasang dengan `...Once`: `clearAllMocks` tak menghapus
   * implementasi, dan `answer.groupBy` punya bawaan `[]` yang dipakai uji
   * sebaran skor.
   */
  const mockBatchAktif = (surveyId: number, nilai: number[][], jumlahResponden: number) => {
    const idPertanyaan = (i: number) => surveyId * 100 + i + 1;
    (prisma.question.findMany as jest.Mock).mockResolvedValue(
      nilai.map((_, i) => ({
        id: idPertanyaan(i),
        surveyId,
        kodeUnsur: `U${i + 1}`,
        teks: `Unsur ${i + 1}`,
      })),
    );
    (prisma.answer.groupBy as jest.Mock).mockResolvedValueOnce(
      nilai.map((daftar, i) => ({
        questionId: idPertanyaan(i),
        _sum: { nilai: daftar.reduce((a, b) => a + b, 0) },
      })),
    );
    (prisma.surveyResponse.groupBy as jest.Mock).mockResolvedValueOnce(
      jumlahResponden === 0 ? [] : [{ surveyId, _count: { _all: jumlahResponden } }],
    );
  };

  describe('getResults', () => {
    it('survei tidak ada → NotFound', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.getResults(1, kabupatenUser())).rejects.toThrow(NotFoundException);
    });

    it('Admin OPD lain → Forbidden', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(survey({ opdId: 99 }));
      await expect(service.getResults(1, opdUser(5))).rejects.toThrow(ForbiddenException);
    });

    it('belum ada responden → nilaiIkm & mutu null', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[], [], []]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.jumlahResponden).toBe(0);
      expect(result.nilaiIkm).toBeNull();
      expect(result.mutu).toBeNull();
      expect(result.nrrPerUnsur).toEqual([]);
    });

    it('tanpa pertanyaan unsur → nilaiIkm null meski ada responden', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getResults(1, kabupatenUser());
      expect(result.nilaiIkm).toBeNull();
    });

    it('semua nilai 4 (maksimal) → IKM=100, mutu A', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(survey());
      // 9 unsur, 2 responden, keduanya menilai 4
      (prisma.question.findMany as jest.Mock).mockResolvedValue(
        unsurQuestions(Array.from({ length: 9 }, () => [4, 4])),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nilaiIkm).toBe(100);
      expect(result.mutu).toBe(IkmMutu.A);
      expect(result.nrrPerUnsur).toHaveLength(9);
      expect(result.nrrPerUnsur[0].nrr).toBe(4);
    });

    it('semua nilai 1 (minimal) → IKM=25, mutu D', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(
        unsurQuestions(Array.from({ length: 9 }, () => [1, 1])),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nilaiIkm).toBe(25);
      expect(result.mutu).toBe(IkmMutu.D);
    });

    it('nilai campuran → NRR & IKM dihitung sesuai rumus PermenPANRB 14/2017', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(survey());
      // 1 unsur saja, 4 responden: nilai 3,3,4,4 → NRR=3.5, bobot=1 (hanya 1 unsur)
      // IKM = 3.5 * 1 * 25 = 87.5 → mutu B (76.61-88.30)
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[3, 3, 4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(4);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nrrPerUnsur[0].nrr).toBe(3.5);
      expect(result.nilaiIkm).toBe(87.5);
      expect(result.mutu).toBe(IkmMutu.B);
    });

    /**
     * NAMA UNSUR DI LAPORAN (8 Oktober 2026). Pada survei SKM, `questions.teks`
     * unsur berisi KALIMAT pertanyaan buatan OPD. Tabel analitik, ekspor, dan
     * snapshot tetap harus menyebut nama resmi unsurnya, yang diambil dari kode.
     * Hanya sumber nama yang berubah; rumusnya tidak.
     */
    describe('nama unsur di laporan', () => {
      const hitung = async (pertanyaan: unknown[]) => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(survey());
        (prisma.question.findMany as jest.Mock).mockResolvedValue(pertanyaan);
        (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);
        return service.getResults(1, kabupatenUser());
      };

      it('unsur baku memakai nama resmi dari kodenya, bukan kalimat pertanyaan OPD', async () => {
        const result = await hitung([
          {
            id: 1,
            kodeUnsur: 'U3',
            teks: 'Seberapa cepat layanan kami selesai?',
            answers: [{ nilai: 4 }, { nilai: 4 }],
          },
        ]);

        expect(result.nrrPerUnsur[0].kodeUnsur).toBe('U3');
        expect(result.nrrPerUnsur[0].teks).toBe('Waktu Penyelesaian');
      });

      it('kode yang tidak dikenal (survei lama berkode kustom) memakai teks pertanyaannya', async () => {
        const result = await hitung([
          { id: 1, kodeUnsur: 'K1', teks: 'Unsur kustom', answers: [{ nilai: 3 }, { nilai: 3 }] },
        ]);

        expect(result.nrrPerUnsur[0].teks).toBe('Unsur kustom');
      });

      it('tanpa kode unsur: kodeUnsur kosong dan teks pertanyaan dipertahankan', async () => {
        const result = await hitung([
          { id: 1, kodeUnsur: null, teks: 'Tanpa kode', answers: [{ nilai: 2 }, { nilai: 2 }] },
        ]);

        expect(result.nrrPerUnsur[0].kodeUnsur).toBe('');
        expect(result.nrrPerUnsur[0].teks).toBe('Tanpa kode');
      });

      it('mengganti sumber nama tidak menggeser hitungan: NRR, bobot, dan IKM tetap', async () => {
        const result = await hitung([
          { id: 1, kodeUnsur: 'U1', teks: 'Kalimat OPD', answers: [{ nilai: 3 }, { nilai: 4 }] },
        ]);

        expect(result.nrrPerUnsur[0]).toEqual(
          expect.objectContaining({ nrr: 3.5, bobot: 1, nrrTertimbang: 3.5 }),
        );
        expect(result.nilaiIkm).toBe(87.5);
      });
    });
  });

  describe('getSummary', () => {
    it('mengembalikan jumlah responden & nilaiIkm dari computeResult (bukan objek Survey mentah)', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue(
        unsurQuestions(Array.from({ length: 9 }, () => [4, 4])),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getSummary(survey() as never);

      expect(result).toEqual({
        respondentsCount: 2,
        nilaiIkm: 100,
        nilaiRataRata: null,
        nilaiSurvei: null,
      });
    });

    it('belum ada responden → nilaiIkm null, respondentsCount 0', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[], [], []]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getSummary(survey() as never);

      expect(result).toEqual({
        respondentsCount: 0,
        nilaiIkm: null,
        nilaiRataRata: null,
        nilaiSurvei: null,
      });
    });

    it('TIDAK memanggil prisma.survey.findUnique (survey sudah dipunyai caller)', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      await service.getSummary(survey() as never);

      expect(prisma.survey.findUnique).not.toHaveBeenCalled();
    });
  });

  /**
   * NILAI RATA-RATA (7 Oktober 2026, permintaan pengguna: tampilkan nilai
   * rata-rata di halaman respons, tabel survei, dan statistik).
   *
   * Rata-rata SEMUA jawaban skala (1-4), dan BUKAN IKM. Di data pengembangan
   * empat survei aktif yang sudah menerima jawaban tak punya 9 unsur baku,
   * sehingga IKM-nya `null` dan setiap layar menampilkan "-" -- padahal
   * jawabannya ada. Itu kasus yang dijaga di sini.
   */
  describe('nilai rata-rata', () => {
    const rataRata = (nilai: number | null) =>
      (prisma.answer.aggregate as jest.Mock).mockResolvedValueOnce({ _avg: { nilai } });

    it('dibulatkan dua desimal', async () => {
      rataRata(3.842105);

      await expect(service.hitungNilaiRataRata(7)).resolves.toBe(3.84);
    });

    it('belum ada jawaban skala -> null, BUKAN 0', async () => {
      // 0 terbaca sebagai hasil ukur terburuk; skala dimulai dari 1.
      rataRata(null);

      await expect(service.hitungNilaiRataRata(7)).resolves.toBeNull();
    });

    it('hanya menghitung jawaban skala yang berNILAI, pada survei yang diminta', async () => {
      rataRata(3);

      await service.hitungNilaiRataRata(7);

      expect(prisma.answer.aggregate).toHaveBeenCalledWith({
        where: {
          nilai: { not: null },
          question: { tipe: 'skala' },
          response: { surveyId: 7 },
        },
        _avg: { nilai: true },
      });
    });

    it('getSummary: survei TANPA unsur baku -> IKM null tetapi rata-rata TERISI', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]); // tak ada unsur baku
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(5);
      rataRata(3.84);

      const result = await service.getSummary(survey() as never);

      expect(result).toEqual({
        respondentsCount: 5,
        nilaiIkm: null,
        nilaiRataRata: 3.84,
        nilaiSurvei: null,
      });
    });

    it('getSummary: survei ber-IKM memuat KEDUANYA, dan angkanya boleh berbeda', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue(
        unsurQuestions(Array.from({ length: 9 }, () => [4, 4])),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);
      // Satu pertanyaan skala tambahan di luar sembilan unsur menurunkan rata-rata
      // semua jawaban, sementara IKM hanya melihat sembilan unsur.
      rataRata(3.7);

      const result = await service.getSummary(survey() as never);

      expect(result.nilaiIkm).toBe(100);
      expect(result.nilaiRataRata).toBe(3.7);
    });

    it('getResults memuat nilaiRataRata, juga saat survei belum dapat dinilai IKM-nya', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(4);
      rataRata(3.13);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nilaiIkm).toBeNull();
      expect(result.nilaiRataRata).toBe(3.13);
    });

    it('computeResult TIDAK menghitung rata-rata: dashboard & statistik publik tak membutuhkannya', async () => {
      // Dashboard dan GET /statistics memanggil computeResult untuk setiap survei
      // aktif; menaruh agregat ini di sana menambah satu kueri per survei pada
      // jalur yang tak memakainya.
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      await service.computeResult(survey() as never);

      expect(prisma.answer.aggregate).not.toHaveBeenCalled();
    });
  });

  /**
   * NILAI SURVEI (8 Oktober 2026): survei custom menghasilkan "Nilai Survei"
   * menurut tujuan + metode, dari rata-rata jawaban skala yang SUDAH dihitung
   * `hitungNilaiRataRata` -- tanpa kueri tambahan. Rumus tampilannya diuji di
   * nilai-survei.util.spec; di sini yang dibuktikan adalah penyambungannya.
   */
  describe('nilai survei', () => {
    const rataRata = (nilai: number | null) =>
      (prisma.answer.aggregate as jest.Mock).mockResolvedValueOnce({ _avg: { nilai } });
    const custom = (over: Record<string, unknown> = {}) =>
      survey({ jenis: 'custom', tujuan: 'kepuasan', metodeNilai: 'rata_rata', ...over });

    beforeEach(() => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(3);
    });

    it('getSummary custom: nilaiSurvei terisi menurut metode rata_rata', async () => {
      rataRata(3.4);

      const result = await service.getSummary(custom() as never);

      expect(result.nilaiSurvei).toMatchObject({
        judul: 'Nilai Survei',
        tampilan: '3,40 / 4',
        kategori: 'Sangat Puas',
      });
    });

    it('getSummary custom dengan metode indeks_persen dan tujuan evaluasi', async () => {
      rataRata(3.4);

      const result = await service.getSummary(
        custom({ tujuan: 'evaluasi', metodeNilai: 'indeks_persen' }) as never,
      );

      expect(result.nilaiSurvei).toMatchObject({
        judul: 'Indeks Evaluasi',
        tampilan: '85%',
        kategori: 'Sangat Baik',
      });
    });

    it('getSummary custom: tujuan dan metode NULL (fixture/baris lama) memakai bawaan', async () => {
      rataRata(2.6);

      const result = await service.getSummary(custom({ tujuan: null, metodeNilai: null }) as never);

      expect(result.nilaiSurvei).toMatchObject({ judul: 'Nilai Survei', kategori: 'Puas' });
    });

    it('getSummary custom tanpa jawaban skala: nilaiSurvei null, BUKAN nol', async () => {
      rataRata(null);

      const result = await service.getSummary(custom() as never);

      expect(result.nilaiSurvei).toBeNull();
    });

    it('getSummary SKM: nilaiSurvei selalu null walau ada jawaban skala', async () => {
      rataRata(3.4);

      const result = await service.getSummary(survey({ jenis: 'skm_permenpanrb' }) as never);

      expect(result.nilaiSurvei).toBeNull();
    });

    it('getResults custom memuat jenis dan nilaiSurvei', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(custom());
      rataRata(3.4);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.jenis).toBe('custom');
      expect(result.nilaiSurvei).toMatchObject({ tampilan: '3,40 / 4' });
    });

    it('getResults SKM memuat jenis dan nilaiSurvei null', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        survey({ jenis: 'skm_permenpanrb' }),
      );
      rataRata(3.4);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.jenis).toBe('skm_permenpanrb');
      expect(result.nilaiSurvei).toBeNull();
    });
  });

  /**
   * SEBARAN SKOR (8 Oktober 2026, permintaan pengguna: kartu "Distribusi Skor
   * Belum Tersedia" di Statistik & Laporan diganti fitur sungguhan).
   *
   * Berapa responden memilih tiap nilai 1-4 pada TIAP pertanyaan skala --
   * unsur baku (U1-U9) maupun pertanyaan skala tambahan milik OPD. Semua
   * pertanyaan skala, bukan hanya unsur baku: survei tanpa 9 unsur baku (empat
   * survei aktif di data pengembangan) akan kosong lagi bila dibatasi ke unsur.
   */
  describe('sebaran skor', () => {
    const pertanyaan = (id: number, over: Record<string, unknown> = {}) => ({
      id,
      teks: `Pertanyaan ${id}`,
      kodeUnsur: null,
      ...over,
    });

    // `...Once` yang TAK terpakai (tes yang melewati kueri jawaban) tertinggal di
    // antrean dan dimakan tes berikutnya; `clearAllMocks` tak menghapusnya.
    // Dipulihkan ke bawaan "tak ada jawaban" supaya antarkasus tak saling bocor.
    afterEach(() => {
      (prisma.answer.groupBy as jest.Mock).mockReset().mockResolvedValue([]);
    });

    /** `computeResult` meminta unsur baku (`isIkmUnsur`), sebaran meminta semua skala. */
    const pasang = (skala: unknown[], baris: unknown[] = []) => {
      (prisma.question.findMany as jest.Mock).mockImplementation(
        ({ where }: { where: { isIkmUnsur?: boolean } }) =>
          Promise.resolve(where.isIkmUnsur ? [] : skala),
      );
      (prisma.answer.groupBy as jest.Mock).mockResolvedValueOnce(baris);
    };

    it('satu entri per pertanyaan skala, berurutan, dengan keempat nilai selalu ada', async () => {
      pasang(
        [pertanyaan(10, { kodeUnsur: 'U1' }), pertanyaan(11)],
        [{ questionId: 10, nilai: 4, _count: { _all: 2 } }],
      );

      const hasil = await service.hitungSebaranSkor(7);

      expect(hasil.map((p) => p.pertanyaanId)).toEqual([10, 11]);
      // Nilai yang tak dipilih siapa pun tetap ada dan bernilai 0, bukan hilang:
      // tanpanya bilah bertumpuk di antarmuka tak punya empat segmen yang pasti.
      expect(hasil[0].sebaran).toEqual([
        { nilai: 1, jumlah: 0 },
        { nilai: 2, jumlah: 0 },
        { nilai: 3, jumlah: 0 },
        { nilai: 4, jumlah: 2 },
      ]);
    });

    it('unsur baku membawa kodenya, pertanyaan skala tambahan null', async () => {
      pasang([pertanyaan(10, { kodeUnsur: 'U1' }), pertanyaan(11)]);

      const hasil = await service.hitungSebaranSkor(7);

      expect(hasil[0].kodeUnsur).toBe('U1');
      expect(hasil[1].kodeUnsur).toBeNull();
    });

    it('jumlah dicocokkan ke pertanyaan dan nilai yang benar, total = jumlah keempatnya', async () => {
      pasang(
        [pertanyaan(10), pertanyaan(11)],
        [
          { questionId: 10, nilai: 1, _count: { _all: 1 } },
          { questionId: 10, nilai: 3, _count: { _all: 4 } },
          { questionId: 11, nilai: 3, _count: { _all: 9 } },
        ],
      );

      const [p10, p11] = await service.hitungSebaranSkor(7);

      expect(p10.total).toBe(5);
      expect(p10.sebaran.map((s) => s.jumlah)).toEqual([1, 0, 4, 0]);
      // Jawaban pertanyaan 11 tak boleh bocor ke pertanyaan 10.
      expect(p11.total).toBe(9);
      expect(p11.sebaran.map((s) => s.jumlah)).toEqual([0, 0, 9, 0]);
    });

    it('pertanyaan yang belum dijawab tetap tampil dengan total 0, bukan dibuang', async () => {
      pasang([pertanyaan(10)]);

      const [p] = await service.hitungSebaranSkor(7);

      expect(p.total).toBe(0);
      expect(p.sebaran.map((s) => s.jumlah)).toEqual([0, 0, 0, 0]);
    });

    it('tanpa pertanyaan skala -> larik kosong, dan kueri jawaban TIDAK dijalankan', async () => {
      pasang([]);

      await expect(service.hitungSebaranSkor(7)).resolves.toEqual([]);

      expect(prisma.answer.groupBy).not.toHaveBeenCalled();
    });

    it('nilai di luar 1-4 diabaikan, bukan merusak total', async () => {
      // Skala dijaga saat pengiriman; ini pagar bila ada baris lama yang menyimpang.
      pasang(
        [pertanyaan(10)],
        [
          { questionId: 10, nilai: 4, _count: { _all: 2 } },
          { questionId: 10, nilai: 9, _count: { _all: 5 } },
        ],
      );

      const [p] = await service.hitungSebaranSkor(7);

      expect(p.total).toBe(2);
    });

    it('kueri: pertanyaan skala survei itu berurut, dan jawaban dikelompokkan per pertanyaan & nilai', async () => {
      pasang([pertanyaan(10)]);

      await service.hitungSebaranSkor(7);

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { surveyId: 7, tipe: 'skala' },
          orderBy: { urutan: 'asc' },
        }),
      );
      expect(prisma.answer.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['questionId', 'nilai'],
          where: { nilai: { not: null }, question: { surveyId: 7, tipe: 'skala' } },
          _count: { _all: true },
        }),
      );
    });

    it('getResults memuat sebaranSkor, juga saat survei belum dapat dinilai IKM-nya', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(survey());
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(4);
      pasang([pertanyaan(10)], [{ questionId: 10, nilai: 3, _count: { _all: 4 } }]);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nilaiIkm).toBeNull(); // tanpa unsur baku
      expect(result.sebaranSkor).toHaveLength(1);
      expect(result.sebaranSkor?.[0].total).toBe(4);
    });

    it('computeResult TIDAK menghitung sebaran: dashboard & statistik publik tak membutuhkannya', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      await service.computeResult(survey() as never);

      expect(prisma.answer.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('snapshot', () => {
    it('tanpa responden → tidak upsert', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      await service.snapshot(1);

      expect(prisma.ikmResult.upsert).not.toHaveBeenCalled();
    });

    it('dengan responden → upsert ke ikm_results', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      await service.snapshot(1);

      expect(prisma.ikmResult.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { surveyId_periode: { surveyId: 1, periode: '2026' } },
          create: expect.objectContaining({ nilaiIkm: 100, mutu: IkmMutu.A, jumlahResponden: 2 }),
        }),
      );
    });

    it('survei tidak ditemukan → tidak error, tidak upsert', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(null);
      await service.snapshot(999);
      expect(prisma.ikmResult.upsert).not.toHaveBeenCalled();
    });
  });

  describe('exportResults', () => {
    const surveyWithOpd = (over: Record<string, unknown> = {}) => ({
      ...survey(),
      judul: 'Survei Kepuasan Layanan',
      opd: { id: 5, nama: 'Dinas Kesehatan' },
      ...over,
    });

    it('survei tidak ada → NotFound', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.exportResults(1, 'csv', kabupatenUser())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Admin OPD lain → Forbidden', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyWithOpd({ opdId: 99 }));
      await expect(service.exportResults(1, 'csv', opdUser(5))).rejects.toThrow(ForbiddenException);
    });

    it('format csv → memanggil IkmExportService.toCsv', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyWithOpd());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.exportResults(1, 'csv', kabupatenUser());

      expect(ikmExportService.toCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          surveyJudul: 'Survei Kepuasan Layanan',
          opdNama: 'Dinas Kesehatan',
        }),
      );
      expect(result.contentType).toContain('text/csv');
      expect(result.buffer.toString()).toBe('csv-content');
    });

    it('format excel → memanggil IkmExportService.toExcel', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyWithOpd());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.exportResults(1, 'excel', kabupatenUser());

      expect(ikmExportService.toExcel).toHaveBeenCalled();
      expect(result.contentType).toContain('spreadsheetml');
    });

    it('format pdf → memanggil IkmExportService.toPdf', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyWithOpd());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.exportResults(1, 'pdf', kabupatenUser());

      expect(ikmExportService.toPdf).toHaveBeenCalled();
      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toBe('hasil-ikm-1-2026.csv');
    });

    // 8 Oktober 2026: laporan survei custom membawa Nilai Survei, bukan IKM.
    describe('survei custom', () => {
      const custom = (over: Record<string, unknown> = {}) =>
        surveyWithOpd({ jenis: 'custom', tujuan: 'kepuasan', metodeNilai: 'rata_rata', ...over });

      beforeEach(() => {
        (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);
        (ikmExportService.buildFilename as jest.Mock).mockClear();
      });

      it('mengirim nilaiSurvei ke pembangun berkas dan memakai awalan hasil-survei', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(custom());
        (prisma.answer.aggregate as jest.Mock).mockResolvedValueOnce({ _avg: { nilai: 3.4 } });

        await service.exportResults(1, 'csv', kabupatenUser());

        expect(ikmExportService.toCsv).toHaveBeenCalledWith(
          expect.objectContaining({
            nilaiSurvei: expect.objectContaining({
              judul: 'Nilai Survei',
              tampilan: '3,40 / 4',
              kategori: 'Sangat Puas',
            }),
          }),
        );
        expect(ikmExportService.buildFilename).toHaveBeenCalledWith(
          1,
          '2026',
          'csv',
          'hasil-survei',
        );
      });

      it('custom tanpa jawaban skala: nilaiSurvei null (bukan undefined) agar laporan berkata "Belum dapat dinilai"', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(custom());
        (prisma.answer.aggregate as jest.Mock).mockResolvedValueOnce({ _avg: { nilai: null } });

        await service.exportResults(1, 'csv', kabupatenUser());

        const ctx = (ikmExportService.toCsv as jest.Mock).mock.calls.at(-1)[0];
        expect(ctx.nilaiSurvei).toBeNull();
      });

      it('survei SKM: nilaiSurvei tidak dikirim dan awalan tetap hasil-ikm', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
          surveyWithOpd({ jenis: 'skm_permenpanrb' }),
        );

        await service.exportResults(1, 'csv', kabupatenUser());

        const ctx = (ikmExportService.toCsv as jest.Mock).mock.calls.at(-1)[0];
        expect(ctx.nilaiSurvei).toBeUndefined();
        expect(ikmExportService.buildFilename).toHaveBeenCalledWith(1, '2026', 'csv', 'hasil-ikm');
      });
    });
  });

  describe('getDashboard', () => {
    it('tanpa hasil → items kosong, rataRataIkm null', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      const result = await service.getDashboard({});
      expect(result.items).toEqual([]);
      expect(result.rataRataIkm).toBeNull();
      expect(result.totalOpd).toBe(0);
      expect(result.totalResponden).toBe(0);
    });

    it('mengurutkan dari nilai IKM tertinggi & menghitung peringkat', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([
        dashboardRow({ nilaiIkm: 90, surveyId: 10, jumlahResponden: 5 }),
        dashboardRow({
          nilaiIkm: 70,
          surveyId: 11,
          jumlahResponden: 3,
          survey: {
            id: 11,
            opdId: 2,
            judul: 'Survei Disdik',
            opd: { id: 2, nama: 'Dinas Pendidikan', jenisLayanan: 'Pendidikan' },
          },
        }),
      ]);

      const result = await service.getDashboard({});

      expect(result.items).toHaveLength(2);
      expect(result.items[0].peringkat).toBe(1);
      expect(result.items[0].nilaiIkm).toBe(90);
      expect(result.items[1].peringkat).toBe(2);
      expect(result.rataRataIkm).toBe(80);
      expect(result.totalOpd).toBe(2);
      expect(result.totalResponden).toBe(8);
    });

    it('(2026-08-05) survei AKTIF yg sudah punya responden ikut ditampilkan, status=aktif', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.survey.findMany as jest.Mock).mockResolvedValue([
        {
          id: 20,
          opdId: 3,
          periode: '2026-Q3',
          judul: 'Survei Aktif Disdik',
          opd: { nama: 'Dinas Pendidikan' },
        },
      ]);
      mockBatchAktif(20, Array(9).fill([4, 4]), 2);

      const result = await service.getDashboard({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('aktif');
      expect(result.items[0].nilaiIkm).toBe(100);
      expect(result.items[0].opdNama).toBe('Dinas Pendidikan');
    });

    it('(2026-08-05) survei AKTIF tanpa responden TIDAK ditampilkan (nilaiIkm null)', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.survey.findMany as jest.Mock).mockResolvedValue([
        {
          id: 21,
          opdId: 3,
          periode: '2026-Q3',
          judul: 'Survei Kosong',
          opd: { nama: 'Dinas Pendidikan' },
        },
      ]);
      mockBatchAktif(21, Array(9).fill([]), 0);

      const result = await service.getDashboard({});

      expect(result.items).toEqual([]);
    });

    /**
     * Regresi nyata (31 Agustus 2026). Sejak commit 23a189c mengizinkan
     * `ditutup -> aktif` ("survei dapat dibuka kembali"), sebuah survei bisa
     * BERSTATUS AKTIF SEKALIGUS MASIH MEMILIKI snapshot `ikm_results` dari
     * ketika ia ditutup -- snapshot tidak dihapus saat dibuka kembali, dan
     * memang tidak boleh dihapus: ia catatan resmi periode itu.
     *
     * Akibatnya survei yang sama masuk DUA KALI ke `items`: sekali dari
     * `closedItems` (dilabeli `ditutup`) dan sekali dari `activeItems`. Yang
     * rusak bukan cuma tampilan -- `rataRataIkm` dan `totalResponden`
     * menghitungnya ganda, jadi angka utama dashboard Admin Kabupaten salah.
     * Gejala yang terlihat lebih dulu justru peringatan React "two children
     * with the same key" di IkmLeaderboard, yang mem-key baris dgn `opdId`.
     *
     * Yang benar: selama survei masih aktif, angkanya adalah hasil LIVE --
     * konsisten dgn `getResults`, yang selalu menghitung ulang dan tak pernah
     * membaca snapshot.
     */
    it('(2026-08-31) survei DIBUKA KEMBALI tidak muncul ganda -- snapshot lama diabaikan, angka live yang dipakai', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([
        dashboardRow({
          surveyId: 22,
          nilaiIkm: 77.78,
          jumlahResponden: 1,
          survey: {
            id: 22,
            opdId: 40,
            judul: 'Survei Satpol PP',
            status: SurveyStatus.aktif, // <- sudah dibuka kembali
            opd: { id: 40, nama: 'Satuan Polisi Pamong Praja', jenisLayanan: null },
          },
        }),
      ]);
      (prisma.survey.findMany as jest.Mock).mockResolvedValue([
        {
          id: 22,
          opdId: 40,
          periode: '2026',
          judul: 'Survei Satpol PP',
          opd: { nama: 'Satuan Polisi Pamong Praja' },
        },
      ]);
      // 9 unsur, satu responden menilai 3 di semuanya -> IKM 3*25 = 75.
      mockBatchAktif(22, Array(9).fill([3]), 1);

      const result = await service.getDashboard({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].surveyId).toBe(22);
      expect(result.items[0].status).toBe(SurveyStatus.aktif);
      expect(result.items[0].nilaiIkm).toBe(75);
      // Bukan (77,78 + 75) / 2 = 76,39, dan responden bukan 2.
      expect(result.rataRataIkm).toBe(75);
      expect(result.totalResponden).toBe(1);
    });

    /**
     * Sisi lain aturan yang sama: snapshot survei yang MASIH ditutup tetap
     * dipakai. Tanpa penjaga ini, "abaikan snapshot" bisa disalahterapkan
     * menjadi "abaikan semua snapshot" dan seluruh riwayat IKM hilang.
     */
    it('snapshot survei yang masih ditutup TETAP ditampilkan', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([
        dashboardRow({
          surveyId: 22,
          nilaiIkm: 77.78,
          jumlahResponden: 1,
          survey: {
            id: 22,
            opdId: 40,
            judul: 'Survei Satpol PP',
            status: SurveyStatus.ditutup,
            opd: { id: 40, nama: 'Satuan Polisi Pamong Praja', jenisLayanan: null },
          },
        }),
      ]);
      (prisma.survey.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDashboard({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe(SurveyStatus.ditutup);
      expect(result.items[0].nilaiIkm).toBe(77.78);
    });

    it('filter periode diteruskan ke where', async () => {
      // Contoh nilainya DIGANTI menjadi periode kanonik (6 Oktober 2026).
      // Sebelumnya uji ini memakai `'2025'` sebagai contoh sembarang, dan nilai
      // itu kini punya arti tersendiri -- "setahun penuh" -- sehingga `where`
      // yang dihasilkannya memang bukan kecocokan persis lagi. Lihat blok
      // "penyaring periode setahun penuh" di bawah.
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      await service.getDashboard({ periode: '2025-Q1' });
      expect(prisma.ikmResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { periode: '2025-Q1' } }),
      );
    });

    it('filter jenisLayanan diteruskan sebagai nested where survey.opd', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      await service.getDashboard({ jenisLayanan: 'Kesehatan' });
      expect(prisma.ikmResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { survey: { opd: { jenisLayanan: 'Kesehatan' } } },
        }),
      );
    });

    it('dua OPD sama menghasilkan totalOpd unik (bukan jumlah baris)', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([
        dashboardRow({ surveyId: 10, periode: '2025' }),
        dashboardRow({ surveyId: 20, periode: '2026' }), // OPD sama (opdId:1), periode beda
      ]);
      const result = await service.getDashboard({});
      expect(result.totalOpd).toBe(1);
    });

    it('(INT-13) menyisipkan openComplaints/newComplaints/systemActivityPercent', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.complaint.count as jest.Mock)
        .mockResolvedValueOnce(4) // openComplaints
        .mockResolvedValueOnce(2); // newComplaints
      (prisma.opd.count as jest.Mock)
        .mockResolvedValueOnce(10) // activeOpdCount
        .mockResolvedValueOnce(3); // opdWithActiveSurveyCount

      const result = await service.getDashboard({});

      expect(result.openComplaints).toBe(4);
      expect(result.newComplaints).toBe(2);
      expect(result.systemActivityPercent).toBe(30);
    });

    it('(INT-13) tak ada OPD aktif -> systemActivityPercent null (bukan NaN/div-by-zero)', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.opd.count as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await service.getDashboard({});

      expect(result.systemActivityPercent).toBeNull();
    });

    it('(INT-13) filter jenisLayanan diteruskan ke hitung pengaduan', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      await service.getDashboard({ jenisLayanan: 'Kesehatan' });
      expect(prisma.complaint.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ opd: { jenisLayanan: 'Kesehatan' } }),
        }),
      );
    });
  });

  /**
   * PENYARING SETAHUN PENUH (6 Oktober 2026).
   *
   * Penyaring periode di antarmuka dipisah menjadi dua dropdown -- Tahun
   * (wajib) dan Triwulan (boleh "Semua") -- atas permintaan pengguna. Memilih
   * "Semua Triwulan" mengirim nilai BERTAHUN SAJA (`2026`), bukan periode
   * kanonik (`2026-Q2`), dan kecocokan persis di sini akan mengembalikan nol
   * baris untuk setiap survei yang ada.
   *
   * AWALAN YANG DIJANGKARKAN, bukan `contains`: `periode: { startsWith: '2026-' }`
   * dengan tanda hubung tersurat. Tanpa tanda hubung itu, `20261-Q1` -- tahun
   * yang sama sekali lain -- ikut tercocok.
   */
  describe('getDashboard: penyaring periode setahun penuh', () => {
    it('nilai bertahun menyaring dengan awalan, bukan kecocokan persis', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);

      await service.getDashboard({ periode: '2026' });

      const where = (prisma.ikmResult.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.periode).toEqual({ startsWith: '2026-' });
    });

    it('survei aktif disaring dengan aturan yang SAMA', async () => {
      // Dua sumber, satu aturan: snapshot `ikm_results` dan live-compute survei
      // aktif. Menyaring salah satunya saja menghasilkan dashboard yang
      // isinya separuh benar.
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.survey.findMany as jest.Mock).mockResolvedValue([]);

      await service.getDashboard({ periode: '2026' });

      const where = (prisma.survey.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.periode).toEqual({ startsWith: '2026-' });
    });

    it('periode kanonik tetap dicocokkan PERSIS, seperti sebelumnya', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);

      await service.getDashboard({ periode: '2026-Q2' });

      const where = (prisma.ikmResult.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.periode).toBe('2026-Q2');
    });

    it('tanpa periode, kunci `periode` tak ikut ditulis sama sekali', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);

      await service.getDashboard({});

      const where = (prisma.ikmResult.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where).not.toHaveProperty('periode');
    });
  });

  /**
   * SINGGAHAN HITUNGAN IKM (8 Oktober 2026).
   *
   * `hitungNilaiRataRata` dan `hitungSebaranSkor` adalah fungsi MURNI dari
   * `surveyId`: tak satu pun menyentuh `CurrentUser`, dan karena itu menaruh
   * singgahan di sini TIDAK DAPAT membocorkan hasil satu OPD ke OPD lain.
   * Itulah sebabnya singgahannya dipasang pada kedua hitungan ini, bukan pada
   * `getResults` yang memeriksa hak akses.
   */
  describe('singgahan hitungan IKM', () => {
    it('hitungNilaiRataRata: kena singgahan -> tak menyentuh basis data', async () => {
      const singgahan = {
        ambil: jest.fn().mockResolvedValue(3.42),
        simpan: jest.fn(),
      };
      const s = new IkmService(
        prisma,
        ikmExportService,
        singgahan as unknown as PenyimpanSinggahan,
      );

      await expect(s.hitungNilaiRataRata(7)).resolves.toBe(3.42);

      expect(prisma.answer.aggregate).not.toHaveBeenCalled();
      expect(singgahan.simpan).not.toHaveBeenCalled();
    });

    it('hitungNilaiRataRata: meleset -> hitung lalu simpan dengan kunci ber-surveyId', async () => {
      const singgahan = { ambil: jest.fn().mockResolvedValue(null), simpan: jest.fn() };
      const s = new IkmService(
        prisma,
        ikmExportService,
        singgahan as unknown as PenyimpanSinggahan,
      );
      (prisma.answer.aggregate as jest.Mock).mockResolvedValueOnce({ _avg: { nilai: 3.1 } });

      await expect(s.hitungNilaiRataRata(7)).resolves.toBe(3.1);

      expect(prisma.answer.aggregate).toHaveBeenCalledTimes(1);
      const [kunci, nilai] = singgahan.simpan.mock.calls[0];
      // Kuncinya WAJIB memuat surveyId: tanpa itu survei kedua membaca angka
      // milik survei pertama.
      expect(String(kunci)).toContain('7');
      expect(nilai).toBe(3.1);
    });

    it('hitungSebaranSkor: kena singgahan -> tak menyentuh basis data', async () => {
      // Bentuknya WAJIB `SebaranSkorEntity` apa adanya: yang keluar dari Redis
      // adalah JSON polos hasil serialisasi entity itu, bukan bentuk karangan.
      const tersimpan = [
        {
          pertanyaanId: 1,
          kodeUnsur: 'U1',
          teks: 'Kesesuaian persyaratan',
          total: 3,
          sebaran: [
            { nilai: 1, jumlah: 0 },
            { nilai: 2, jumlah: 0 },
            { nilai: 3, jumlah: 1 },
            { nilai: 4, jumlah: 2 },
          ],
        },
      ];
      const singgahan = { ambil: jest.fn().mockResolvedValue(tersimpan), simpan: jest.fn() };
      const s = new IkmService(
        prisma,
        ikmExportService,
        singgahan as unknown as PenyimpanSinggahan,
      );

      await expect(s.hitungSebaranSkor(7)).resolves.toEqual(tersimpan);

      expect(prisma.question.findMany).not.toHaveBeenCalled();
      expect(prisma.answer.groupBy).not.toHaveBeenCalled();
    });

    /**
     * GAGAL-TERBUKA diuji di tingkat PENYIMPAN, bukan di sini. Kontrak
     * `PenyimpanSinggahan.ambil` berbunyi "nilai tersimpan, atau `null` bila
     * tak ada / tak terjangkau", jadi yang menelan galat Redis adalah
     * implementasinya; `getStatistics` yang sudah ada pun tanpa `try/catch`.
     * Menambahkannya di IkmService berarti menelan galat dua kali dan
     * menyembunyikan implementasi yang melanggar kontraknya.
     *
     * Yang diuji di sini: penyimpan NONAKTIF (selalu meleset) menghasilkan
     * perilaku yang persis sama dengan sebelum singgahan ada.
     */
    it('penyimpan nonaktif -> selalu hitung dari basis data, tak pernah kena', async () => {
      const s = new IkmService(prisma, ikmExportService, new PenyimpanSinggahanNonaktif());
      (prisma.answer.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _avg: { nilai: 2.5 } })
        .mockResolvedValueOnce({ _avg: { nilai: 2.5 } });

      await expect(s.hitungNilaiRataRata(7)).resolves.toBe(2.5);
      await expect(s.hitungNilaiRataRata(7)).resolves.toBe(2.5);

      expect(prisma.answer.aggregate).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * SINGGAHAN `computeResult` (9 Oktober 2026).
   *
   * DIUKUR SEBELUM DIBANGUN, bukan diduga: 35,7 ms untuk satu survei berisi
   * 500 jawaban, dan `getDashboard` memanggilnya SEKALI PER SURVEI AKTIF.
   * Komentar di `ikm.service.ts` sendiri sudah menyebut polanya N+1. Dengan 4
   * survei aktif ini belum masalah; yang disiapkan adalah pertumbuhannya.
   *
   * `periode` SENGAJA TIDAK IKUT DISINGGAHKAN, dan ini bukan penghematan
   * melainkan kebenaran: ia satu-satunya masukan `computeResult` yang berasal
   * dari objek `Survey` yang dikirimkan, bukan dari basis data, dan ia DAPAT
   * disunting. Menyinggahkannya berarti survei yang periodenya diperbaiki
   * tetap melaporkan periode lama sampai TTL lewat. Yang disinggahkan hanya
   * bagian yang murni berasal dari basis data.
   *
   * Masukan lainnya beku oleh aturan produk, dan itu terbukti di kode bukan di
   * dokumen: `assertBolehHapusPertanyaan`, `assertBolehBuatPertanyaan`, dan
   * `assertBolehUbahPenandaUnsur` di `kerangka-unsur.util.ts` semuanya menolak
   * perubahan himpunan unsur maupun kodenya pada survei SKM.
   *
   * YANG TETAP DAPAT BASI sampai 60 detik: `urutan` pertanyaan yang diubah
   * (hanya mengubah urutan `nrrPerUnsur`), dan `teks` pertanyaan pada survei
   * lama ber-`kodeUnsur` tak dikenal yang memakai teksnya sebagai nama unsur.
   * Keduanya disengaja, dibatasi TTL.
   */
  describe('singgahan computeResult', () => {
    const tersimpan = {
      jumlahResponden: 4,
      nrrPerUnsur: [
        { kodeUnsur: 'U1', teks: 'Kesesuaian persyaratan', nrr: 3.5, bobot: 1, nrrTertimbang: 3.5 },
      ],
      nilaiIkm: 87.5,
      mutu: IkmMutu.B,
      dihitungPada: new Date('2026-10-09T03:00:00.000Z').toISOString(),
    };
    const buat = (singgahan: { ambil: jest.Mock; simpan: jest.Mock }) =>
      new IkmService(prisma, ikmExportService, singgahan as unknown as PenyimpanSinggahan);

    it('kena singgahan -> tak menyentuh basis data', async () => {
      const singgahan = { ambil: jest.fn().mockResolvedValue(tersimpan), simpan: jest.fn() };

      const hasil = await buat(singgahan).computeResult(survey({ id: 7 }) as never);

      expect(hasil.nilaiIkm).toBe(87.5);
      expect(hasil.mutu).toBe(IkmMutu.B);
      expect(prisma.question.findMany).not.toHaveBeenCalled();
      expect(prisma.surveyResponse.count).not.toHaveBeenCalled();
      expect(singgahan.simpan).not.toHaveBeenCalled();
    });

    /** Inti pemisahannya: periode hidup, sisanya dari singgahan. */
    it('periode diambil dari survei yang dikirim, BUKAN dari singgahan', async () => {
      const singgahan = {
        ambil: jest.fn().mockResolvedValue({ ...tersimpan, periode: '2020-SALAH' }),
        simpan: jest.fn(),
      };

      const hasil = await buat(singgahan).computeResult(
        survey({ id: 7, periode: '2026-Q4' }) as never,
      );

      expect(hasil.periode).toBe('2026-Q4');
    });

    it('nrrPerUnsur dari singgahan dibungkus ulang menjadi entity, bukan JSON polos', async () => {
      const singgahan = { ambil: jest.fn().mockResolvedValue(tersimpan), simpan: jest.fn() };

      const hasil = await buat(singgahan).computeResult(survey({ id: 7 }) as never);

      expect(hasil.nrrPerUnsur).toHaveLength(1);
      expect(hasil.nrrPerUnsur[0]).toBeInstanceOf(IkmUnsurEntity);
    });

    it('meleset -> hitung, lalu simpan TANPA periode, kunci ber-surveyId, TTL 60', async () => {
      const singgahan = { ambil: jest.fn().mockResolvedValue(null), simpan: jest.fn() };
      (prisma.question.findMany as jest.Mock).mockResolvedValueOnce(unsurQuestions([[4, 4, 4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValueOnce(4);

      const hasil = await buat(singgahan).computeResult(survey({ id: 7 }) as never);

      expect(hasil.nilaiIkm).toBe(100);
      const [kunci, nilai, ttl] = singgahan.simpan.mock.calls[0];
      // Tanpa surveyId di kunci, survei kedua membaca hasil survei pertama.
      expect(String(kunci)).toContain('7');
      expect(ttl).toBe(60);
      expect(nilai).not.toHaveProperty('periode');
    });

    it('survei tanpa responden TIDAK disinggahkan', async () => {
      // Hitungannya paling murah justru di keadaan ini, dan menyinggahkan
      // "belum dapat dinilai" berarti survei yang baru menerima jawaban
      // pertamanya tetap melaporkan nol sampai TTL lewat -- cacat yang sama
      // seperti yang ditangkap e2e pada sebaran skor.
      const singgahan = { ambil: jest.fn().mockResolvedValue(null), simpan: jest.fn() };
      (prisma.question.findMany as jest.Mock).mockResolvedValueOnce(unsurQuestions([[4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValueOnce(0);

      const hasil = await buat(singgahan).computeResult(survey({ id: 7 }) as never);

      expect(hasil.nilaiIkm).toBeNull();
      expect(singgahan.simpan).not.toHaveBeenCalled();
    });
  });
});

/**
 * JALUR BATCH, yang menggantikan 744 panggilan `computeResult` di
 * `getDashboard` dan `DashboardService.getStatistics`.
 *
 * MENGAPA UJINYA MEMBANDINGKAN DUA JALUR, bukan hanya mengecek angkanya.
 * Risiko sebenarnya di sini bukan lambat melainkan angka IKM RESMI yang
 * berubah tanpa ada yang sadar: `computeResult` adalah sumber rumus tunggal
 * menurut PermenPANRB 14/2017, dan jalur batch menghitung ulang hal yang sama
 * dengan kueri berbeda. Jadi angkanya dipatok dua kali -- sekali terhadap
 * bilangan yang dihitung tangan, sekali terhadap keluaran `computeResult`
 * untuk data yang sama.
 */
describe('hitungHasilBanyak', () => {
  const prismaB = {
    question: { findMany: jest.fn() },
    answer: { groupBy: jest.fn() },
    surveyResponse: { groupBy: jest.fn(), count: jest.fn() },
  } as unknown as PrismaService;
  const serviceB = new IkmService(
    prismaB,
    {} as unknown as IkmExportService,
    new PenyimpanSinggahanNonaktif(),
  );

  // Mock TERSENDIRI untuk jalur lama, bukan yang dipakai `describe` di atas:
  // blok ini berada di luar penutupnya, jadi `prisma`/`service` di sana tak
  // dalam jangkauan. Dibuktikan oleh `Tests: 0 total` pada jalan pertama.
  const prismaLama = {
    survey: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    question: { findMany: jest.fn() },
    surveyResponse: { count: jest.fn() },
    answer: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { nilai: null } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
  const serviceLama = new IkmService(
    prismaLama,
    {} as unknown as IkmExportService,
    new PenyimpanSinggahanNonaktif(),
  );

  const surveiAktif = (id: number, opdId: number) =>
    ({
      id,
      opdId,
      periode: '2026-Q1',
      judul: `Survei ${id}`,
    }) as unknown as Parameters<typeof serviceB.hitungHasilBanyak>[0][number];

  beforeEach(() => jest.clearAllMocks());

  it('menghitung dua survei sekaligus dengan TIGA kueri, bukan satu per survei', async () => {
    (prismaB.question.findMany as jest.Mock).mockResolvedValue([
      { id: 11, surveyId: 1, kodeUnsur: 'U1', teks: 'U1', urutan: 1 },
      { id: 12, surveyId: 1, kodeUnsur: 'U2', teks: 'U2', urutan: 2 },
      { id: 13, surveyId: 1, kodeUnsur: 'U3', teks: 'U3', urutan: 3 },
      { id: 21, surveyId: 2, kodeUnsur: 'U1', teks: 'U1', urutan: 1 },
    ]);
    (prismaB.answer.groupBy as jest.Mock).mockResolvedValue([
      { questionId: 11, _sum: { nilai: 8 } },
      { questionId: 12, _sum: { nilai: 6 } },
      { questionId: 13, _sum: { nilai: 4 } },
      { questionId: 21, _sum: { nilai: 12 } },
    ]);
    (prismaB.surveyResponse.groupBy as jest.Mock).mockResolvedValue([
      { surveyId: 1, _count: { _all: 2 } },
      { surveyId: 2, _count: { _all: 3 } },
    ]);

    const hasil = await serviceB.hitungHasilBanyak([surveiAktif(1, 5), surveiAktif(2, 6)]);

    // Survei 1: nrr 8/2=4, 6/2=3, 4/2=2; bobot 1/3; (4+3+2)/3 = 3; x25 = 75.
    const s1 = hasil.get(1);
    expect(s1?.jumlahResponden).toBe(2);
    expect(s1?.nilaiIkm).toBe(75);
    expect(s1?.nrrPerUnsur.map((u) => u.nrr)).toEqual([4, 3, 2]);
    // Survei 2: satu unsur, nrr 12/3=4, bobot 1; 4x25 = 100.
    expect(hasil.get(2)?.nilaiIkm).toBe(100);
    expect(hasil.get(2)?.jumlahResponden).toBe(3);

    // Tiga kueri, apa pun jumlah surveinya. Ini inti perbaikannya; tanpa
    // penegasan ini seseorang dapat "memperbaiki" ini kembali menjadi N+1
    // tanpa satu uji pun memerah.
    expect(prismaB.question.findMany).toHaveBeenCalledTimes(1);
    expect(prismaB.answer.groupBy).toHaveBeenCalledTimes(1);
    expect(prismaB.surveyResponse.groupBy).toHaveBeenCalledTimes(1);
  });

  /**
   * PENYARING RELASI, bukan daftar `IN` berisi id pertanyaan.
   *
   * Versi pertama `hitungHasilBanyak` memuat pertanyaannya lebih dulu lalu
   * mengirim id-nya KEMBALI ke Postgres sebagai `questionId: { in: [...] }`.
   * Pada 744 survei itu 6.696 bilangan yang melintasi kabel dua arah dan satu
   * daftar sepanjang itu yang harus direncanakan Postgres. Terukur 13 Oktober
   * 2026: `/dashboard/ikm` 1.775 ms untuk satu permintaan pada 6,7 juta
   * jawaban, padahal HTTP 500-nya sudah hilang.
   */
  it('menyaring jawaban lewat relasi, bukan daftar IN berisi id pertanyaan', async () => {
    (prismaB.question.findMany as jest.Mock).mockResolvedValue([
      { id: 11, surveyId: 1, kodeUnsur: 'U1', teks: 'U1' },
      { id: 21, surveyId: 2, kodeUnsur: 'U1', teks: 'U1' },
    ]);
    (prismaB.answer.groupBy as jest.Mock).mockResolvedValue([]);
    (prismaB.surveyResponse.groupBy as jest.Mock).mockResolvedValue([]);

    await serviceB.hitungHasilBanyak([surveiAktif(1, 5), surveiAktif(2, 6)]);

    const argumen = (prismaB.answer.groupBy as jest.Mock).mock.calls[0][0] as {
      where: unknown;
    };
    expect(argumen.where).toEqual({
      question: { surveyId: { in: [1, 2] }, isIkmUnsur: true },
    });
  });

  it('TIDAK menarik baris jawaban ke memori', async () => {
    (prismaB.question.findMany as jest.Mock).mockResolvedValue([]);
    (prismaB.answer.groupBy as jest.Mock).mockResolvedValue([]);
    (prismaB.surveyResponse.groupBy as jest.Mock).mockResolvedValue([]);

    await serviceB.hitungHasilBanyak([surveiAktif(1, 5)]);

    // `include: { answers: ... }` itulah yang menarik 6,7 juta baris melintasi
    // kabel pada jalur lama. Ia tak boleh kembali diam-diam.
    const argumen = (prismaB.question.findMany as jest.Mock).mock.calls[0][0] as {
      include?: unknown;
    };
    expect(argumen.include).toBeUndefined();
  });

  it.each([
    ['tanpa responden', [], [{ questionId: 11, _sum: { nilai: 8 } }]],
    ['tanpa unsur', [{ surveyId: 1, _count: { _all: 4 } }], []],
  ])('belum dapat dinilai: %s → nilaiIkm & mutu null', async (_nama, respons, jawaban) => {
    (prismaB.question.findMany as jest.Mock).mockResolvedValue(
      _nama === 'tanpa unsur'
        ? []
        : [{ id: 11, surveyId: 1, kodeUnsur: 'U1', teks: 'U1', urutan: 1 }],
    );
    (prismaB.answer.groupBy as jest.Mock).mockResolvedValue(jawaban);
    (prismaB.surveyResponse.groupBy as jest.Mock).mockResolvedValue(respons);

    const hasil = await serviceB.hitungHasilBanyak([surveiAktif(1, 5)]);

    expect(hasil.get(1)?.nilaiIkm).toBeNull();
    expect(hasil.get(1)?.mutu).toBeNull();
  });

  it('survei tanpa satu pun jawaban tetapi punya responden → nilaiIkm 0', async () => {
    (prismaB.question.findMany as jest.Mock).mockResolvedValue([
      { id: 11, surveyId: 1, kodeUnsur: 'U1', teks: 'U1', urutan: 1 },
    ]);
    (prismaB.answer.groupBy as jest.Mock).mockResolvedValue([]);
    (prismaB.surveyResponse.groupBy as jest.Mock).mockResolvedValue([
      { surveyId: 1, _count: { _all: 4 } },
    ]);

    expect((await serviceB.hitungHasilBanyak([surveiAktif(1, 5)])).get(1)?.nilaiIkm).toBe(0);
  });

  /**
   * PENGUNCI RUMUS. Data yang sama diberikan kepada kedua jalur dalam dua
   * bentuk kueri, lalu keluarannya harus sama persis. Inilah satu-satunya uji
   * di berkas ini yang akan memerah bila jalur batch menghitung IKM dengan cara
   * yang berbeda, sekecil apa pun bedanya.
   */
  it('menghasilkan angka IDENTIK dengan computeResult untuk data yang sama', async () => {
    const nilai = [
      [4, 3, 4, 2],
      [3, 3, 2, 4],
      [1, 2, 2, 1],
    ];
    const jumlahResponden = 4;

    // Jalur lama: `include: { answers }` + `count`.
    (prismaLama.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions(nilai));
    (prismaLama.surveyResponse.count as jest.Mock).mockResolvedValue(jumlahResponden);
    const satuan = await serviceLama.computeResult(survey() as never);

    // Jalur batch: tiga agregat.
    (prismaB.question.findMany as jest.Mock).mockResolvedValue(
      nilai.map((_, i) => ({
        id: i + 1,
        surveyId: 1,
        kodeUnsur: `U${i + 1}`,
        teks: `Unsur ${i + 1}`,
        urutan: i + 1,
      })),
    );
    (prismaB.answer.groupBy as jest.Mock).mockResolvedValue(
      nilai.map((daftar, i) => ({
        questionId: i + 1,
        _sum: { nilai: daftar.reduce((a, b) => a + b, 0) },
      })),
    );
    (prismaB.surveyResponse.groupBy as jest.Mock).mockResolvedValue([
      { surveyId: 1, _count: { _all: jumlahResponden } },
    ]);
    const batch = (await serviceB.hitungHasilBanyak([surveiAktif(1, 5)])).get(1);

    expect(batch?.nilaiIkm).toBe(satuan.nilaiIkm);
    expect(batch?.mutu).toBe(satuan.mutu);
    expect(batch?.jumlahResponden).toBe(satuan.jumlahResponden);
    expect(batch?.nrrPerUnsur.map((u) => [u.kodeUnsur, u.nrr, u.nrrTertimbang])).toEqual(
      satuan.nrrPerUnsur.map((u) => [u.kodeUnsur, u.nrr, u.nrrTertimbang]),
    );
  });
});

/**
 * SINGGAHAN `/dashboard/ikm`, pola yang sama dengan `GET /statistics`.
 *
 * MENGAPA. Sesudah jalur agregat batch ada, kedua endpoint memakai hitungan
 * yang sama -- tetapi `/statistics` dibungkus singgahan read-through sementara
 * `/dashboard/ikm` tidak. Terukur 13 Oktober 2026 pada 6,7 juta jawaban: 13 ms
 * lawan 6.102 ms, dan itulah seluruh jurangnya.
 *
 * YANG DITUKAR, dan pemilik produk menyetujuinya: angka di layar Admin
 * Kabupaten dapat tertinggal sampai 60 detik. `/statistics` sudah menerima
 * pertukaran yang sama dengan TTL yang sama.
 */
describe('IkmService.getDashboard — singgahan', () => {
  const simpanan = new Map<string, unknown>();
  const singgahan = {
    ambil: jest.fn((kunci: string) => Promise.resolve(simpanan.get(kunci) ?? null)),
    simpan: jest.fn((kunci: string, nilai: unknown) => {
      simpanan.set(kunci, nilai);
      return Promise.resolve();
    }),
    hapus: jest.fn(() => Promise.resolve()),
  } as unknown as PenyimpanSinggahan;

  const prismaS = {
    survey: { findMany: jest.fn().mockResolvedValue([]) },
    question: { findMany: jest.fn().mockResolvedValue([]) },
    answer: { groupBy: jest.fn().mockResolvedValue([]) },
    surveyResponse: { groupBy: jest.fn().mockResolvedValue([]) },
    ikmResult: { findMany: jest.fn().mockResolvedValue([]) },
    complaint: { count: jest.fn().mockResolvedValue(0) },
    opd: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;
  const serviceS = new IkmService(prismaS, {} as unknown as IkmExportService, singgahan);

  beforeEach(() => {
    jest.clearAllMocks();
    simpanan.clear();
  });

  it('panggilan kedua dengan kueri sama TIDAK menyentuh basis data lagi', async () => {
    await serviceS.getDashboard({});
    const sesudahPertama = (prismaS.ikmResult.findMany as jest.Mock).mock.calls.length;
    expect(sesudahPertama).toBeGreaterThan(0);

    await serviceS.getDashboard({});

    expect((prismaS.ikmResult.findMany as jest.Mock).mock.calls.length).toBe(sesudahPertama);
  });

  /**
   * Kueri yang berbeda WAJIB berkunci berbeda. Satu kunci untuk semua akan
   * menyajikan hasil tersaring periode kepada orang yang tak menyaring apa pun
   * -- cacat kebenaran, bukan cacat kecepatan.
   */
  it('penyaring berbeda memakai kunci berbeda', async () => {
    await serviceS.getDashboard({});
    await serviceS.getDashboard({ periode: '2026-Q1' });
    await serviceS.getDashboard({ jenisLayanan: 'Kesehatan' });

    // Disaring ke kunci dashboard: `simpan` juga dipakai token generasinya.
    const kunci = (singgahan.simpan as jest.Mock).mock.calls
      .map(([k]: [string]) => k)
      .filter((k: string) => k.startsWith(AWALAN_DASHBOARD));
    expect(new Set(kunci).size).toBe(3);
    for (const k of kunci) {
      expect(k.startsWith(AWALAN_DASHBOARD)).toBe(true);
    }
  });

  /**
   * MELESET berarti hitung ulang, dan itu kontraknya. Uji ini sempat saya tulis
   * dengan `ambil` yang MENOLAK, lalu saya ganti: `PenyimpanSinggahan`
   * menyatakan tersurat bahwa pembacaan yang galat dilaporkan sebagai meleset
   * (gagal-terbuka) dan galatnya ditelan implementasinya. Menguji penolakan
   * berarti memaku perilaku di luar kontrak dan memaksa kode bertahan terhadap
   * hal yang tak pernah terjadi.
   */
  it('meleset membuatnya menghitung dari basis data, bukan melempar', async () => {
    (singgahan.ambil as jest.Mock).mockResolvedValueOnce(null);

    await expect(serviceS.getDashboard({})).resolves.toBeDefined();

    expect((prismaS.ikmResult.findMany as jest.Mock).mock.calls.length).toBeGreaterThan(0);
  });
});

describe('kunciSinggahanDashboardIkm', () => {
  it('berawalan ikm-dashboard:', () => {
    expect(kunciSinggahanDashboardIkm('g1').startsWith(AWALAN_DASHBOARD)).toBe(true);
  });

  it('kueri kosong, periode saja, dan jenis saja menghasilkan tiga kunci berbeda', () => {
    const kunci = [
      kunciSinggahanDashboardIkm('g1'),
      kunciSinggahanDashboardIkm('g1', '2026-Q1'),
      kunciSinggahanDashboardIkm('g1', undefined, 'Kesehatan'),
    ];
    expect(new Set(kunci).size).toBe(3);
  });

  /**
   * GENERASI BERGANTI = SELURUH KUNCI LAMA JADI TANPA INDUK. Itulah seluruh
   * mekanisme pembatalannya: jalur tulis tak perlu tahu kombinasi penyaring apa
   * saja yang pernah disinggahkan, cukup menghapus satu kunci generasi.
   */
  it('generasi berbeda menghasilkan kunci berbeda untuk kueri yang sama', () => {
    expect(kunciSinggahanDashboardIkm('g1', '2026-Q1')).not.toBe(
      kunciSinggahanDashboardIkm('g2', '2026-Q1'),
    );
  });

  it('generasi ikut dikodekan sehingga tak dapat bertabrakan dengan periode', () => {
    expect(kunciSinggahanDashboardIkm('g:1')).not.toBe(kunciSinggahanDashboardIkm('g', '1'));
  });

  /**
   * Dua medan yang bertukar tempat tak boleh bertemu di kunci yang sama. Tanpa
   * pemisah yang tegas, `periode='a:b'` + tanpa jenis bertabrakan dengan
   * `periode='a'` + `jenisLayanan='b'`, dan satu pemakai melihat hasil saringan
   * pemakai lain.
   */
  it('tidak bertabrakan ketika nilainya memuat pemisah', () => {
    expect(kunciSinggahanDashboardIkm('g1', 'a:b')).not.toBe(
      kunciSinggahanDashboardIkm('g1', 'a', 'b'),
    );
  });

  it('kueri yang sama selalu menghasilkan kunci yang sama', () => {
    expect(kunciSinggahanDashboardIkm('g1', '2026-Q1', 'Kesehatan')).toBe(
      kunciSinggahanDashboardIkm('g1', '2026-Q1', 'Kesehatan'),
    );
  });
});

/**
 * KUNCI GENERASI IKUT DALAM DAFTAR PEMBATALAN PER SURVEI, dan itu memakai
 * titik perluasan yang sudah dirancang: docblock `kunciSinggahanIkm` menyatakan
 * ia mengembalikan DAFTAR justru supaya hitungan tersinggahkan berikutnya ikut
 * dibatalkan tanpa menyentuh jalur tulis -- tempat yang paling mudah
 * terlupakan. Jawaban baru mengubah survei AKTIF yang dihitung live di
 * dashboard, jadi dashboard-nya memang harus ikut hangus.
 */
describe('kunciSinggahanIkm', () => {
  it('memuat kunci generasi dashboard', () => {
    expect(kunciSinggahanIkm(7)).toContain(KUNCI_GENERASI_DASHBOARD);
  });

  it('tetap memuat ketiga kunci per survei', () => {
    const kunci = kunciSinggahanIkm(7);
    expect(kunci).toContain('ikm-hasil:7');
    expect(kunci).toContain('ikm-rata:7');
    expect(kunci).toContain('ikm-sebaran:7');
  });
});

/**
 * PEMBATALAN SINGGAHAN DASHBOARD lewat token generasi.
 *
 * Ditemukan e2e 13 Oktober 2026: `role-journeys.e2e-spec.ts` menutup survei
 * lalu menuntut survei itu muncul di `GET /dashboard/ikm`, dan dengan singgahan
 * tanpa pembatalan ia tidak muncul sampai TTL 60 detik lewat. Uji itu memaku
 * harapan produk yang nyata, jadi yang salah adalah singgahannya.
 *
 * Kunci dashboard bergantung pada parameter kueri, sehingga tak dapat
 * diturunkan dari id survei yang berubah -- karena itu generasi, bukan daftar
 * kunci. Jalur tulis menghapus satu kunci generasi dan seluruh kunci lama
 * menjadi tanpa induk lalu mati sendiri lewat TTL-nya.
 */
describe('IkmService.getDashboard — pembatalan generasi', () => {
  const simpanan = new Map<string, unknown>();
  const singgahan = {
    ambil: jest.fn((kunci: string) => Promise.resolve(simpanan.get(kunci) ?? null)),
    simpan: jest.fn((kunci: string, nilai: unknown) => {
      simpanan.set(kunci, nilai);
      return Promise.resolve();
    }),
    hapus: jest.fn((kunci: string) => {
      simpanan.delete(kunci);
      return Promise.resolve();
    }),
  } as unknown as PenyimpanSinggahan;

  const prismaG = {
    survey: { findMany: jest.fn().mockResolvedValue([]) },
    question: { findMany: jest.fn().mockResolvedValue([]) },
    answer: { groupBy: jest.fn().mockResolvedValue([]) },
    surveyResponse: { groupBy: jest.fn().mockResolvedValue([]) },
    ikmResult: { findMany: jest.fn().mockResolvedValue([]) },
    complaint: { count: jest.fn().mockResolvedValue(0) },
    opd: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;
  const serviceG = new IkmService(prismaG, {} as unknown as IkmExportService, singgahan);

  const jumlahBacaDb = () => (prismaG.ikmResult.findMany as jest.Mock).mock.calls.length;

  beforeEach(() => {
    jest.clearAllMocks();
    simpanan.clear();
  });

  it('sesudah batalkanSinggahanDashboard, panggilan berikutnya menghitung ulang', async () => {
    await serviceG.getDashboard({});
    const sebelum = jumlahBacaDb();
    await serviceG.getDashboard({});
    expect(jumlahBacaDb()).toBe(sebelum);

    await serviceG.batalkanSinggahanDashboard();

    await serviceG.getDashboard({});
    expect(jumlahBacaDb()).toBeGreaterThan(sebelum);
  });

  it('pembatalan hanya menghapus kunci generasi, bukan menebak kunci kuerinya', async () => {
    await serviceG.getDashboard({ periode: '2026-Q1' });
    (singgahan.hapus as jest.Mock).mockClear();

    await serviceG.batalkanSinggahanDashboard();

    const dihapus = (singgahan.hapus as jest.Mock).mock.calls.map(([k]: [string]) => k);
    expect(dihapus).toEqual([KUNCI_GENERASI_DASHBOARD]);
  });

  it('generasi dipakai ulang antarpermintaan, bukan dibuat baru tiap kali', async () => {
    await serviceG.getDashboard({});
    await serviceG.getDashboard({ periode: '2026-Q1' });

    const kunci = (singgahan.simpan as jest.Mock).mock.calls
      .map(([k]: [string]) => k)
      .filter((k: string) => k.startsWith(AWALAN_DASHBOARD));
    const generasi = new Set(kunci.map((k: string) => k.split(':')[1]));
    expect(generasi.size).toBe(1);
  });
});

/**
 * PENAHAN CACHE STAMPEDE pada `GET /dashboard/ikm` (13 Oktober 2026).
 *
 * Masalahnya satu dengan `GET /statistics` dan karena itu mekanismenya satu
 * juga: pada detik singgahannya kosong, setiap permintaan yang tiba masuk ke
 * jalur hitung. Terukur pada 744 survei dan 6,7 juta baris `answers`: sepuluh
 * koneksi serentak menghasilkan 0 permintaan tuntas dan 10 galat.
 *
 * KUNCI SATU-JALANNYA TANPA GENERASI, dan itu bukan kelalaian. `generasiDashboard`
 * sendiri membaca singgahan, jadi sepuluh permintaan ke singgahan kosong
 * menerbitkan sepuluh generasi berbeda -- tepat pada keadaan yang hendak
 * diredam. Memakai kunci singgahan yang sudah bergenerasi berarti kesepuluhnya
 * berkunci berbeda dan penahannya tak menahan apa pun.
 */
describe('IkmService.getDashboard — penahan stampede', () => {
  const simpanan = new Map<string, unknown>();
  const singgahan = {
    ambil: jest.fn((kunci: string) => Promise.resolve(simpanan.get(kunci) ?? null)),
    simpan: jest.fn((kunci: string, nilai: unknown) => {
      simpanan.set(kunci, nilai);
      return Promise.resolve();
    }),
    hapus: jest.fn((kunci: string) => {
      simpanan.delete(kunci);
      return Promise.resolve();
    }),
  } as unknown as PenyimpanSinggahan;

  const prismaP = {
    survey: { findMany: jest.fn().mockResolvedValue([]) },
    question: { findMany: jest.fn().mockResolvedValue([]) },
    answer: { groupBy: jest.fn().mockResolvedValue([]) },
    surveyResponse: { groupBy: jest.fn().mockResolvedValue([]) },
    ikmResult: { findMany: jest.fn().mockResolvedValue([]) },
    complaint: { count: jest.fn().mockResolvedValue(0) },
    opd: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;

  const bacaDb = () => (prismaP.ikmResult.findMany as jest.Mock).mock.calls.length;

  beforeEach(() => {
    jest.clearAllMocks();
    simpanan.clear();
  });

  it('sepuluh permintaan SERENTAK ke singgahan kosong hanya menghitung sekali', async () => {
    const svc = new IkmService(prismaP, {} as unknown as IkmExportService, singgahan);

    await Promise.all(Array.from({ length: 10 }, () => svc.getDashboard({})));

    expect(bacaDb()).toBe(1);
  });

  /**
   * Penyaring berbeda WAJIB dihitung tersendiri walau tiba bersamaan. Satu
   * kunci untuk semua akan menyajikan hasil tersaring periode kepada orang yang
   * tak menyaring apa pun -- cacat kebenaran, bukan cacat kecepatan.
   */
  it('penyaring berbeda yang tiba bersamaan tetap dihitung tersendiri', async () => {
    const svc = new IkmService(prismaP, {} as unknown as IkmExportService, singgahan);

    await Promise.all([
      svc.getDashboard({}),
      svc.getDashboard({ periode: '2026-Q1' }),
      svc.getDashboard({ jenisLayanan: 'Kesehatan' }),
    ]);

    expect(bacaDb()).toBe(3);
  });

  it('sepuluh permintaan serentak hanya menerbitkan SATU generasi', async () => {
    const svc = new IkmService(prismaP, {} as unknown as IkmExportService, singgahan);

    await Promise.all(Array.from({ length: 10 }, () => svc.getDashboard({})));

    const kunci = (singgahan.simpan as jest.Mock).mock.calls
      .map(([k]: [string]) => k)
      .filter((k: string) => k.startsWith(AWALAN_DASHBOARD));
    expect(new Set(kunci).size).toBe(1);
  });
});
