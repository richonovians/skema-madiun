import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IkmMutu, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { IkmExportService } from './ikm-export.service';
import { IkmService } from './ikm.service';

const opdUser = (opdId: number | null): CurrentUser => ({ userId: 1, role: Role.opd, opdId });
const kabupatenUser = (): CurrentUser => ({ userId: 2, role: Role.kabupaten, opdId: null });

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
    survey: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    question: { findMany: jest.fn() },
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
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getResults(1, kabupatenUser())).rejects.toThrow(NotFoundException);
    });

    it('Admin OPD lain → Forbidden', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey({ opdId: 99 }));
      await expect(service.getResults(1, opdUser(5))).rejects.toThrow(ForbiddenException);
    });

    it('belum ada responden → nilaiIkm & mutu null', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[], [], []]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.jumlahResponden).toBe(0);
      expect(result.nilaiIkm).toBeNull();
      expect(result.mutu).toBeNull();
      expect(result.nrrPerUnsur).toEqual([]);
    });

    it('tanpa pertanyaan unsur → nilaiIkm null meski ada responden', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getResults(1, kabupatenUser());
      expect(result.nilaiIkm).toBeNull();
    });

    it('semua nilai 4 (maksimal) → IKM=100, mutu A', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
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
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(
        unsurQuestions(Array.from({ length: 9 }, () => [1, 1])),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nilaiIkm).toBe(25);
      expect(result.mutu).toBe(IkmMutu.D);
    });

    it('nilai campuran → NRR & IKM dihitung sesuai rumus PermenPANRB 14/2017', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(survey());
      // 1 unsur saja, 4 responden: nilai 3,3,4,4 → NRR=3.5, bobot=1 (hanya 1 unsur)
      // IKM = 3.5 * 1 * 25 = 87.5 → mutu B (76.61-88.30)
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[3, 3, 4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(4);

      const result = await service.getResults(1, kabupatenUser());

      expect(result.nrrPerUnsur[0].nrr).toBe(3.5);
      expect(result.nilaiIkm).toBe(87.5);
      expect(result.mutu).toBe(IkmMutu.B);
    });
  });

  describe('getSummary', () => {
    it('mengembalikan jumlah responden & nilaiIkm dari computeResult (bukan objek Survey mentah)', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue(
        unsurQuestions(Array.from({ length: 9 }, () => [4, 4])),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getSummary(survey() as never);

      expect(result).toEqual({ respondentsCount: 2, nilaiIkm: 100 });
    });

    it('belum ada responden → nilaiIkm null, respondentsCount 0', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[], [], []]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getSummary(survey() as never);

      expect(result).toEqual({ respondentsCount: 0, nilaiIkm: null });
    });

    it('TIDAK memanggil prisma.survey.findUnique (survey sudah dipunyai caller)', async () => {
      (prisma.question.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);

      await service.getSummary(survey() as never);

      expect(prisma.survey.findUnique).not.toHaveBeenCalled();
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
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.exportResults(1, 'csv', kabupatenUser())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Admin OPD lain → Forbidden', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(surveyWithOpd({ opdId: 99 }));
      await expect(service.exportResults(1, 'csv', opdUser(5))).rejects.toThrow(ForbiddenException);
    });

    it('format csv → memanggil IkmExportService.toCsv', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(surveyWithOpd());
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
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(surveyWithOpd());
      (prisma.question.findMany as jest.Mock).mockResolvedValue(unsurQuestions([[4, 4]]));
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const result = await service.exportResults(1, 'excel', kabupatenUser());

      expect(ikmExportService.toExcel).toHaveBeenCalled();
      expect(result.contentType).toContain('spreadsheetml');
    });

    it('format pdf → memanggil IkmExportService.toPdf', async () => {
      (prisma.survey.findUnique as jest.Mock).mockResolvedValue(surveyWithOpd());
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
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);
      await service.getDashboard({ periode: '2025' });
      expect(prisma.ikmResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { periode: '2025' } }),
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
});
