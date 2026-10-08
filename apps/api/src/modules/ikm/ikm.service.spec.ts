import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IkmMutu, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { IkmExportService } from './ikm-export.service';
import { IkmService } from './ikm.service';

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
    surveyResponse: { count: jest.fn() },
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
  const service = new IkmService(prisma, ikmExportService);

  beforeEach(() => jest.clearAllMocks());

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

      expect(result).toEqual({ respondentsCount: 2, nilaiIkm: 100, nilaiRataRata: null });
    });

    it('belum ada responden → nilaiIkm null, respondentsCount 0', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[], [], []]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getSummary(survey() as never);

      expect(result).toEqual({ respondentsCount: 0, nilaiIkm: null, nilaiRataRata: null });
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

      expect(result).toEqual({ respondentsCount: 5, nilaiIkm: null, nilaiRataRata: 3.84 });
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
      (prisma.question.findMany as jest.Mock).mockResolvedValue(
        unsurQuestions(Array(9).fill([4, 4])),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

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
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions(Array(9).fill([])));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

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
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions(Array(9).fill([3])));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(1);

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
});
