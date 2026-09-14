import { ForbiddenException } from '@nestjs/common';
import { IkmMutu, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from './dashboard.service';
import type { IkmService } from '../ikm/ikm.service';

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
const superUser = (): CurrentUser => ({
  userId: 3,
  roles: [Role.superuser],
  actingRole: Role.superuser,
  opdId: null,
});
const respondenUser = (): CurrentUser => ({
  userId: 4,
  roles: [Role.responden],
  actingRole: Role.responden,
  opdId: null,
});

describe('DashboardService', () => {
  const prisma = {
    // `findMany` default [] -- getStatistics (2026-08-05) ikut query survei
    // `aktif` utk live-compute; tes yg tak peduli survei aktif tak perlu tahu ini.
    survey: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    surveyResponse: { count: jest.fn().mockResolvedValue(0) },
    complaint: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    answer: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    opd: { count: jest.fn().mockResolvedValue(0) },
    ikmResult: { findMany: jest.fn().mockResolvedValue([]) },
    user: { count: jest.fn().mockResolvedValue(0) },
    statisticsInsight: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
  } as unknown as PrismaService;
  const ikmService = {
    getResults: jest.fn(),
    computeResult: jest.fn(),
  } as unknown as IkmService;
  const service = new DashboardService(prisma, ikmService);

  beforeEach(() => jest.clearAllMocks());

  describe('getOpdDashboard', () => {
    it('Admin Kabupaten -> Forbidden (keputusan user 2026-08-20)', async () => {
      await expect(service.getOpdDashboard(kabupatenUser())).rejects.toThrow(ForbiddenException);
      expect(prisma.survey.findFirst).not.toHaveBeenCalled();
    });

    it('peran lain (responden) -> Forbidden', async () => {
      await expect(service.getOpdDashboard(respondenUser())).rejects.toThrow(ForbiddenException);
    });

    it('akun opd tanpa opdId -> Forbidden', async () => {
      await expect(service.getOpdDashboard(opdUser(null))).rejects.toThrow(ForbiddenException);
    });

    /**
     * PERILAKU YANG SENGAJA DIBUANG (6 September 2026, permintaan pengguna:
     * "tetap tidak bisa masuk sebagai admin OPD selain tempat dinas user
     * tersebut"). Sampai 5 September 2026, sesi ber-peran `superuser` boleh
     * meminta OPD MANA PUN lewat `?opdId=`.
     *
     * Uji ini dulu menegaskan kebalikannya; ia diubah menjadi menegaskan
     * penolakan alih-alih dihapus, supaya perubahan kebijakan ini terbaca
     * sebagai keputusan -- bukan sebagai uji yang hilang tanpa jejak.
     *
     * Pasangan "DENGAN ?opdId=" TIDAK lagi bisa ditulis di sini: parameternya
     * sudah tak ada di tanda tangan mana pun, jadi jaminan itu kini struktural.
     * Yang menjaganya di tingkat HTTP -- di mana query masih bisa dikirim
     * siapa pun -- ada di test/multi-role.e2e-spec.ts
     * ("act=superuser + ?opdId= -> 403").
     *
     * Jalan yang benar sekarang: berpindah ke peran `opd` lewat
     * `POST /auth/acting-role`, yang memakai `users.opd_id` akun itu sendiri.
     */
    it('Superuser -> Forbidden (dashboard OPD bukan miliknya)', async () => {
      await expect(service.getOpdDashboard(superUser())).rejects.toThrow(ForbiddenException);
      // Bukan cuma status penolakannya: tak boleh ada satu pun query yang
      // sempat berjalan atas OPD yang bukan miliknya.
      expect(prisma.survey.findFirst).not.toHaveBeenCalled();
      expect(prisma.surveyResponse.count).not.toHaveBeenCalled();
    });

    it('Admin OPD: selalu OPD akunnya sendiri', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);

      await service.getOpdDashboard(opdUser(5));

      expect(prisma.survey.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ opdId: 5 }) }),
      );
    });

    it('tanpa survei non-draft -> ikmScore/mutu null, performanceMetrics kosong', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);
      (prisma.complaint.count as jest.Mock).mockResolvedValue(0);
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.ikmScore).toBeNull();
      expect(result.ikmMutu).toBeNull();
      expect(result.performanceMetrics).toEqual([]);
      expect(ikmService.getResults).not.toHaveBeenCalled();
    });

    it('ada survei -> reuse IkmService.getResults utk ikmScore+performanceMetrics', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({ id: 10, opdId: 5 });
      (ikmService.getResults as jest.Mock).mockResolvedValue({
        nilaiIkm: 88.5,
        mutu: IkmMutu.A,
        nrrPerUnsur: [
          { kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.8, bobot: 0.11, nrrTertimbang: 0.42 },
        ],
      });

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.ikmScore).toBe(88.5);
      expect(result.ikmMutu).toBe(IkmMutu.A);
      expect(result.performanceMetrics).toEqual([
        { code: 'U1', name: 'Persyaratan', realization: 3.8, target: 4.0 },
      ]);
    });

    it('(D3) avgResponseHours dihitung dari createdAt->updatedAt pengaduan selesai', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const updatedAt = new Date('2026-08-01T05:00:00.000Z'); // 5 jam
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([{ createdAt, updatedAt }]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.avgResponseHours).toBe(5);
    });

    it('belum ada pengaduan selesai -> avgResponseHours null', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.avgResponseHours).toBeNull();
      expect(result.slaTargetHours).toBe(24);
    });

    it('(D3) completionRate = selesai/total, null bila belum ada pengaduan', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date(), updatedAt: new Date() },
      ]);
      (prisma.complaint.count as jest.Mock)
        .mockResolvedValueOnce(0) // activeTickets
        .mockResolvedValueOnce(4); // allComplaintsCount

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.completionRate).toBe(25);
    });

    it('(D5) ikmTrend dibangun dari snapshot ikm_results OPD ini, dikelompokkan per triwulan', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        { periode: '2026-Q1', nilaiIkm: 80 },
        { periode: '2026-Q2', nilaiIkm: 90 },
      ]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.ikmTrend).toEqual([
        { periode: '2026-Q1', value: 80 },
        { periode: '2026-Q2', value: 90 },
      ]);
      expect(prisma.ikmResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { survey: { opdId: 5 } } }),
      );
    });

    it('(D4) recentFeedback TIDAK menyertakan identitas pengisi', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.answer.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          teks: 'Pelayanan sudah bagus',
          response: { submittedAt: new Date(), answers: [{ nilai: 4 }, { nilai: 3 }] },
        },
      ]);

      const result = await service.getOpdDashboard(opdUser(5));

      expect(result.recentFeedback).toEqual([
        expect.objectContaining({ id: 1, text: 'Pelayanan sudah bagus', ratingAvg: 3.5 }),
      ]);
      expect(result.recentFeedback[0]).not.toHaveProperty('name');
      expect(result.recentFeedback[0]).not.toHaveProperty('userId');
    });
  });

  describe('getStatistics (D2: publik)', () => {
    it('tanpa data -> summary aman (null/0), bukan error', async () => {
      const result = await service.getStatistics();

      expect(result.summary.ikm).toBeNull();
      expect(result.summary.totalRespondents).toBe(0);
      expect(result.summary.completionRate).toBeNull();
      expect(result.ikmTrend).toEqual([]);
      expect(result.insight.text).toBeNull();
    });

    it('(2026-08-05) survei AKTIF yg sudah punya responden ikut masuk summary.ikm/ikmTrend', async () => {
      (prisma.survey.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 30, opdId: 4, periode: '2026-Q3', judul: 'Survei Aktif', opd: { nama: 'Dinas X' } },
      ]);
      (ikmService.computeResult as jest.Mock).mockResolvedValueOnce({
        nilaiIkm: 84,
        mutu: IkmMutu.B,
        jumlahResponden: 2,
        nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.36 }],
      });

      const result = await service.getStatistics();

      expect(result.summary.ikm).toBe(84);
      expect(result.ikmTrend).toEqual([{ periode: '2026-Q3', value: 84 }]);
    });

    it('(D5) ikmTrend dikelompokkan per periode triwulan, terurut kronologis', async () => {
      const survey = { opdId: 1, opd: { nama: 'Dinas Contoh' } };
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        { nilaiIkm: 80, periode: '2026-Q2', nrrPerUnsur: [], survey },
        { nilaiIkm: 90, periode: '2026-Q1', nrrPerUnsur: [], survey },
        { nilaiIkm: 70, periode: '2026-Q1', nrrPerUnsur: [], survey },
      ]);

      const result = await service.getStatistics();

      expect(result.ikmTrend).toEqual([
        { periode: '2026-Q1', value: 80 }, // rata-rata 90 & 70
        { periode: '2026-Q2', value: 80 },
      ]);
    });

    it('(D3) avgSlaDays & completionRate hanya menghitung status selesai dari query gabungan', async () => {
      (prisma.complaint.count as jest.Mock).mockResolvedValue(4); // totalComplaints
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([
        {
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          updatedAt: new Date('2026-08-03T00:00:00.000Z'), // 2 hari
          status: 'selesai',
        },
        { createdAt: new Date(), updatedAt: new Date(), status: 'diterima' }, // belum selesai -- tak ikut dihitung
      ]);

      const result = await service.getStatistics();

      expect(result.summary.avgSlaDays).toBe(2);
      expect(result.summary.completionRate).toBe(25); // 1 selesai / 4 total
    });

    it('(D5) complaintTrend dibucket dari createdAt ke periode triwulan', async () => {
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date(2026, 0, 10) }, // Q1
        { createdAt: new Date(2026, 1, 10) }, // Q1
        { createdAt: new Date(2026, 4, 10) }, // Q2
      ]);

      const result = await service.getStatistics();

      expect(result.complaintTrend).toEqual([
        { periode: '2026-Q1', value: 2 },
        { periode: '2026-Q2', value: 1 },
      ]);
    });

    it('serviceElements = rata-rata NRR per kode unsur lintas seluruh snapshot', async () => {
      const survey = { opdId: 1, opd: { nama: 'Dinas Contoh' } };
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        {
          nilaiIkm: 80,
          periode: '2026-Q1',
          nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.6 }],
          survey,
        },
        {
          nilaiIkm: 90,
          periode: '2026-Q1',
          nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.8 }],
          survey,
        },
      ]);

      const result = await service.getStatistics();

      expect(result.serviceElements).toEqual([{ code: 'U1', name: 'Persyaratan', avgNrr: 3.7 }]);
    });

    /**
     * Cacat yang SAMA seperti `IkmService.getDashboard` (31 Agustus 2026), dan
     * di sini akibatnya paling terasa: halaman /statistics itu PUBLIK. Sebuah
     * survei yang dibuka kembali masih menyimpan snapshot `ikm_results`-nya,
     * sehingga ikut terhitung dua kali -- sekali dari snapshot, sekali dari
     * live-compute -- dan angka IKM kabupaten yang dipamerkan ke masyarakat
     * jadi salah. Terpantau nyata: 80,56 berubah menjadi 79,63 hanya karena
     * satu survei dibuka kembali.
     *
     * `topOpd` kebetulan lolos (ia mengelompokkan per OPD lalu merata-rata),
     * tapi `summary.ikm`, `ikmTrend`, dan `serviceElements` tidak.
     */
    it('(2026-08-31) survei DIBUKA KEMBALI tidak dihitung dua kali pada statistik publik', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        {
          nilaiIkm: 77.78,
          periode: '2025-Q1',
          nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.11 }],
          survey: {
            opdId: 40,
            status: SurveyStatus.aktif, // <- sudah dibuka kembali
            opd: { nama: 'Satuan Polisi Pamong Praja' },
          },
        },
      ]);
      (prisma.survey.findMany as jest.Mock).mockResolvedValue([
        { id: 22, opdId: 40, periode: '2025-Q1', opd: { nama: 'Satuan Polisi Pamong Praja' } },
      ]);
      (ikmService.computeResult as jest.Mock).mockResolvedValue({
        nilaiIkm: 75,
        nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3 }],
      });

      const result = await service.getStatistics();

      // Bukan (77,78 + 75) / 2 = 76,39.
      expect(result.summary.ikm).toBe(75);
      expect(result.ikmTrend).toEqual([{ periode: '2025-Q1', value: 75 }]);
      expect(result.serviceElements).toEqual([{ code: 'U1', name: 'Persyaratan', avgNrr: 3 }]);
    });

    /** Penjaga arah sebaliknya: snapshot survei yang masih ditutup tetap dihitung. */
    it('snapshot survei yang masih ditutup TETAP dihitung pada statistik publik', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        {
          nilaiIkm: 77.78,
          periode: '2025-Q1',
          nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 3.11 }],
          survey: {
            opdId: 40,
            status: SurveyStatus.ditutup,
            opd: { nama: 'Satuan Polisi Pamong Praja' },
          },
        },
      ]);
      (prisma.survey.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStatistics();

      expect(result.summary.ikm).toBe(77.78);
    });

    it('(INT-14) topOpd = rata-rata IKM per OPD, top 5 desc, dgn peringkat', async () => {
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValueOnce([
        {
          nilaiIkm: 80,
          periode: '2026-Q1',
          nrrPerUnsur: [],
          survey: { opdId: 1, opd: { nama: 'Dinas A' } },
        },
        {
          nilaiIkm: 90,
          periode: '2026-Q1',
          nrrPerUnsur: [],
          survey: { opdId: 2, opd: { nama: 'Dinas B' } },
        },
        {
          nilaiIkm: 70,
          periode: '2026-Q2',
          nrrPerUnsur: [],
          survey: { opdId: 1, opd: { nama: 'Dinas A' } },
        },
      ]);

      const result = await service.getStatistics();

      expect(result.topOpd).toEqual([
        { peringkat: 1, opdId: 2, opdNama: 'Dinas B', nilaiIkm: 90 },
        { peringkat: 2, opdId: 1, opdNama: 'Dinas A', nilaiIkm: 75 }, // rata-rata 80 & 70
      ]);
    });

    it('(INT-14) complaintCategories menerjemahkan kode -> nama & terurut terbanyak', async () => {
      (prisma.complaint.groupBy as jest.Mock).mockImplementation(({ by }: { by: string[] }) => {
        if (by[0] === 'kategori') {
          return Promise.resolve([
            { kategori: 'aduan', _count: { _all: 3 } },
            { kategori: 'lapor', _count: { _all: 7 } },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getStatistics();

      expect(result.complaintCategories).toEqual([
        { kode: 'lapor', nama: 'Lapor', count: 7 },
        { kode: 'aduan', nama: 'Aduan', count: 3 },
      ]);
    });

    it('insight bawa teks tersimpan (D6), bukan dikarang', async () => {
      (prisma.statisticsInsight.findUnique as jest.Mock).mockResolvedValue({
        text: 'Capaian meningkat',
        updatedAt: new Date('2026-08-01'),
      });

      const result = await service.getStatistics();

      expect(result.insight.text).toBe('Capaian meningkat');
    });
  });

  describe('updateInsight', () => {
    it('(D6) upsert baris tunggal id=1', async () => {
      (prisma.statisticsInsight.upsert as jest.Mock).mockResolvedValue({
        id: 1,
        text: 'Narasi baru',
        updatedAt: new Date('2026-08-01'),
        updatedBy: 2,
      });

      const result = await service.updateInsight({ text: 'Narasi baru' }, kabupatenUser());

      expect(prisma.statisticsInsight.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          create: expect.objectContaining({ id: 1, text: 'Narasi baru', updatedBy: 2 }),
          update: expect.objectContaining({ text: 'Narasi baru', updatedBy: 2 }),
        }),
      );
      expect(result.text).toBe('Narasi baru');
    });
  });

  /**
   * JUMLAH AKUN AKTIF (permintaan pengguna 6 September 2026): halaman superuser
   * menampilkan seluruh akun aktif, halaman Admin OPD hanya akun OPD itu.
   */
  describe('jumlah akun aktif', () => {
    it('statistik: activeUsers menghitung akun aktif yang belum dihapus', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(12);
      (prisma.ikmResult.findMany as jest.Mock).mockResolvedValue([]);

      const hasil = await service.getStatistics();

      expect(hasil.summary.activeUsers).toBe(12);
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null, isActive: true },
      });
    });

    it('dashboard OPD: activeOpdUsers hanya akun OPD ITU', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      // Dinyatakan EKSPLISIT, bukan mengandalkan baku: `jest.clearAllMocks()`
      // hanya membersihkan catatan pemanggilan, bukan implementasi, jadi
      // `mockResolvedValue` dari uji sebelumnya masih berlaku di sini.
      (prisma.complaint.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(2);

      const hasil = await service.getOpdDashboard(opdUser(5));

      expect(hasil.activeOpdUsers).toBe(2);
      // KONTROL yang membuat angka ini berarti: tanpa `opdId` pada penyaring,
      // setiap OPD akan menampilkan jumlah akun SELURUH sistem -- angka yang
      // terlihat masuk akal dan sepenuhnya salah.
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null, isActive: true, opdId: 5 },
      });
    });
  });
});
