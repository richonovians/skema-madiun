import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintStatus, QuestionType, Role, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { PENYIMPAN_SINGGAHAN } from '../src/common/cache/penyimpan-singgahan.interface';
import type { PenyimpanSinggahan } from '../src/common/cache/penyimpan-singgahan.interface';
import { devHeaders } from './helpers/auth.helper';

describe('Dashboard & Statistics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let opdUserId: number;
  let respondenId: number;
  let surveyId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EDASH' },
      update: {},
      create: { kode: 'E2EDASH', nama: 'OPD E2E Dashboard', isActive: true },
    });
    opdId = opd.id;

    const opdUser = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-dash-opd' },
      update: {},
      create: {
        ssoSubject: 'e2e-dash-opd',
        nama: 'Admin OPD Dashboard',
        email: 'e2e-dash-opd@example.go.id',
        roles: [Role.opd],
        opdId,
      },
    });
    opdUserId = opdUser.id;

    const responden = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-dash-resp' },
      update: {},
      create: {
        ssoSubject: 'e2e-dash-resp',
        nama: 'Responden Dashboard',
        email: 'e2e-dash-resp@example.go.id',
        roles: [Role.responden],
      },
    });
    respondenId = responden.id;

    const survey = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Dashboard E2E',
        periode: '2026-Q1',
        status: SurveyStatus.aktif,
        questions: {
          create: [
            {
              teks: 'Kepuasan layanan',
              tipe: QuestionType.skala,
              urutan: 1,
              isIkmUnsur: true,
              kodeUnsur: 'U1',
            },
            { teks: 'Saran', tipe: QuestionType.teks, urutan: 2 },
          ],
        },
      },
      include: { questions: { orderBy: { urutan: 'asc' } } },
    });
    surveyId = survey.id;
    const [q1, q2] = survey.questions;

    const response = await prisma.surveyResponse.create({
      data: { surveyId, userId: respondenId, dedupeUserId: respondenId },
    });
    await prisma.answer.createMany({
      data: [
        { responseId: response.id, questionId: q1.id, nilai: 4 },
        { responseId: response.id, questionId: q2.id, teks: 'Pelayanan sudah baik' },
      ],
    });

    await prisma.complaint.create({
      data: {
        ticketNo: 'PGDE2EDASH01',
        userId: respondenId,
        opdId,
        kategori: 'lainnya',
        judul: 'Pengaduan E2E Dashboard',
        uraian: 'Uraian pengaduan e2e dashboard',
        status: ComplaintStatus.diterima,
      },
    });
  }, 60000);

  afterAll(async () => {
    await prisma.complaint.deleteMany({ where: { opdId } });
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    // Menutup survei (test topOpd) memicu AuditInterceptor mencatat audit_logs
    // ber-FK RESTRICT ke users -- harus dihapus dulu sebelum user dihapus.
    await prisma.auditLog.deleteMany({ where: { actorId: opdUserId } });
    await prisma.user.deleteMany({
      where: { ssoSubject: { in: ['e2e-dash-opd', 'e2e-dash-resp'] } },
    });
    await prisma.opd.deleteMany({ where: { kode: 'E2EDASH' } });
    await app.close();
  }, 30000);

  describe('GET /api/v1/dashboard/opd (INT-12)', () => {
    it('Admin OPD -> 200, ikmScore live-compute + performanceMetrics + recentFeedback tanpa identitas (D4)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/opd')
        .set(devHeaders({ role: Role.opd, userId: opdUserId, opdId }));

      expect(res.status).toBe(200);
      expect(res.body.data.ikmScore).toBe(100); // 1 responden, nilai 4 -> NRR 4 -> IKM 100
      expect(res.body.data.performanceMetrics).toHaveLength(1);
      expect(res.body.data.performanceMetrics[0]).toEqual(
        expect.objectContaining({ code: 'U1', realization: 4, target: 4 }),
      );
      expect(res.body.data.recentFeedback).toHaveLength(1);
      expect(res.body.data.recentFeedback[0].text).toBe('Pelayanan sudah baik');
      expect(res.body.data.recentFeedback[0]).not.toHaveProperty('name');
      expect(res.body.data.recentFeedback[0]).not.toHaveProperty('userId');
      expect(res.body.data.activeTickets).toBe(1);
      expect(res.body.data.slaTargetHours).toBe(24);
    });

    it('Admin Kabupaten -> 403 (dashboard ini murni per-OPD)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/opd')
        .set(devHeaders({ role: Role.kabupaten }));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/statistics (INT-14, D2: publik)', () => {
    it('TANPA header Authorization sama sekali -> 200 (bukan 401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/statistics');

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toEqual(
        expect.objectContaining({
          totalRespondents: expect.any(Number),
          totalComplaints: expect.any(Number),
          activeOpd: expect.any(Number),
        }),
      );
      expect(Array.isArray(res.body.data.ikmTrend)).toBe(true);
      expect(Array.isArray(res.body.data.complaintStatus)).toBe(true);
      expect(res.body.data).not.toHaveProperty('insight');
    });

    it('complaintStatus menyertakan pengaduan e2e ini (status diterima)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/statistics');
      const diterima = res.body.data.complaintStatus.find(
        (s: { status: string }) => s.status === 'diterima',
      );
      expect(diterima).toBeDefined();
      expect(diterima.count).toBeGreaterThan(0);
    });

    it('(INT-14) complaintCategories menyertakan kategori "lainnya" dari pengaduan e2e ini', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/statistics');
      const lainnya = res.body.data.complaintCategories.find(
        (c: { kode: string }) => c.kode === 'lainnya',
      );
      expect(lainnya).toBeDefined();
      expect(lainnya.nama).toBe('Lainnya');
      expect(lainnya.count).toBeGreaterThan(0);
    });

    it('(INT-14) topOpd menyertakan OPD e2e ini setelah survei ditutup (snapshot ikm_results)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${surveyId}/status`)
        .set(devHeaders({ role: Role.opd, userId: opdUserId, opdId }))
        .send({ status: 'ditutup' });

      const res = await request(app.getHttpServer()).get('/api/v1/statistics');
      const entry = res.body.data.topOpd.find((o: { opdId: number }) => o.opdId === opdId);
      expect(entry).toBeDefined();
      expect(entry.opdNama).toBe('OPD E2E Dashboard');
      expect(entry.nilaiIkm).toBe(100); // 1 responden nilai 4 -> IKM 100
    });
  });

  /**
   * FITUR INSIGHT & KESIMPULAN DIBUANG (6 Oktober 2026, permintaan pengguna).
   *
   * Keputusan D6 (5 Agustus 2026) menyediakan tempat penyimpanan narasi agar
   * dapat diisi Admin Kabupaten. Terukur sebelum dibuang: tabel
   * `statistics_insight` berisi NOL baris, tak ada satu pun penyunting di
   * frontend, dan endpoint ini tak pernah dipanggil antarmuka mana pun.
   *
   * Diuji sebagai KETIADAAN, bukan dihapus tanpa jejak: endpoint yang dibuang
   * tanpa penjaga dapat kembali diam-diam lewat salinan kode lama.
   */
  describe('PATCH /api/v1/statistics/insight — sudah tiada', () => {
    it('Admin Kabupaten pun menerima 404, bukan 200', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/statistics/insight')
        .set(devHeaders({ role: Role.kabupaten, userId: 999 }))
        .send({ text: 'Capaian pelayanan meningkat triwulan ini.' });

      expect(res.status).toBe(404);
    });

    it('GET /statistics tidak lagi membawa kunci `insight`', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/statistics');

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty('insight');
    });
  });

  describe('GET /api/v1/dashboard/ikm (INT-13: openComplaints/newComplaints/systemActivityPercent)', () => {
    it('menyertakan ketiga field baru dgn tipe benar', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/ikm')
        .set(devHeaders({ role: Role.kabupaten }));

      expect(res.status).toBe(200);
      expect(res.body.data.openComplaints).toEqual(expect.any(Number));
      expect(res.body.data.newComplaints).toEqual(expect.any(Number));
      expect(res.body.data.openComplaints).toBeGreaterThanOrEqual(1); // pengaduan e2e ini (status diterima)
    });
  });

  /**
   * BUG-013 (High, dilaporkan 15 September 2026).
   *
   * Survei yang dibuang ke Sampah tetap ikut menghitung angka yang DIPAMPANG
   * KEPADA PUBLIK. Terukur saat dilaporkan: IKM kabupaten tidak bergeser sedikit
   * pun sesudah survei dibuang (71,11 tetap 71,11), total responden tetap 6, dan
   * papan peringkat Dinas Kesehatan tetap 62,5. Kendalinya pun sudah diukur:
   * memusnahkan survei yang sama secara permanen mengembalikan seluruh angka ke
   * keadaan semula, jadi yang menggerakkannya memang survei di Sampah.
   *
   * Laporan itu menyebut satu sebab, `ikmResult.findMany` tanpa `where`.
   * Penyisiran 19 Oktober 2026 menemukan TUJUH tempat, dan uji di bawah menjaga
   * keempat gejala yang dapat dibaca dari luar:
   *
   *  1. `summary.totalRespondents`  -- `surveyResponse.count()` tanpa penyaring.
   *  2. `valueDistribution`         -- `answer.groupBy` tanpa penyaring survei.
   *  3. `ikmTrend`                  -- dari `ikmResult` tanpa penyaring.
   *  4. Dasbor Admin OPD            -- jumlah responden, riwayat IKM, dan umpan
   *                                    balik terbaru, ketiganya tanpa penyaring.
   *
   * SINGGAHAN DIBUANG SEBELUM TIAP PEMBACAAN. `GET /statistics` dibungkus
   * singgahan ber-TTL 60 detik tanpa invalidasi -- itu rancangan yang disengaja
   * dan bukan bagian dari cacat ini, tetapi tanpa `hapus()` di bawah, pembacaan
   * kedua akan mengembalikan angka lama dan uji ini akan "lulus" atau "gagal"
   * karena singgahan, bukan karena penyaringnya. Antarmuka `PenyimpanSinggahan`
   * sudah menyediakan `hapus`, jadi tak ada kode produksi yang diubah demi
   * keterujian.
   *
   * Surveinya MILIK BLOK INI sendiri, bukan survei bersama di `beforeAll`: uji
   * lain di berkas ini mengubah status survei itu, dan menumpanginya membuat
   * hasil di sini bergantung pada urutan jalan.
   */
  describe('BUG-013 — survei di Sampah tidak boleh menghitung apa pun', () => {
    const PERIODE = '2029-Q3';
    const UMPAN_BALIK = 'Umpan balik penjaga BUG-013';
    let singgahan: PenyimpanSinggahan;
    let surveiSampahId: number;

    const bacaStatistik = async () => {
      // Tanpa ini, pembacaan kedua dijawab singgahan 60 detik dan ujinya
      // mengukur singgahan alih-alih penyaringnya.
      await singgahan.hapus('statistik-publik');
      const res = await request(app.getHttpServer()).get('/api/v1/statistics');
      expect(res.status).toBe(200);
      return res.body.data;
    };

    const bacaDasborOpd = async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/opd')
        .set(devHeaders({ role: Role.opd, userId: opdUserId, opdId }));
      expect(res.status).toBe(200);
      return res.body.data;
    };

    const jumlahNilai = (
      data: { valueDistribution: { value: number; count: number }[] },
      nilai: number,
    ) => data.valueDistribution.find((v) => v.value === nilai)?.count ?? 0;

    beforeAll(async () => {
      singgahan = app.get<PenyimpanSinggahan>(PENYIMPAN_SINGGAHAN, { strict: false });

      const survei = await prisma.survey.create({
        data: {
          opdId,
          judul: 'Survei Yang Akan Dibuang (BUG-013)',
          periode: PERIODE,
          status: SurveyStatus.aktif,
          questions: {
            create: [
              {
                teks: 'Kepuasan layanan (penjaga BUG-013)',
                tipe: QuestionType.skala,
                urutan: 1,
                isIkmUnsur: true,
                kodeUnsur: 'U1',
              },
              { teks: 'Saran (penjaga BUG-013)', tipe: QuestionType.teks, urutan: 2 },
            ],
          },
        },
        include: { questions: { orderBy: { urutan: 'asc' } } },
      });
      surveiSampahId = survei.id;
      const [skala, teks] = survei.questions;

      const respons = await prisma.surveyResponse.create({
        data: { surveyId: survei.id },
      });
      await prisma.answer.createMany({
        data: [
          // Nilai 1 dipilih supaya jejaknya pada `valueDistribution` dan pada IKM
          // tak dapat tertukar dengan jawaban survei bersama (yang bernilai 4).
          { responseId: respons.id, questionId: skala.id, nilai: 1 },
          { responseId: respons.id, questionId: teks.id, teks: UMPAN_BALIK },
        ],
      });
    }, 60000);

    it('statistik publik berhenti menghitungnya sesudah survei masuk Sampah', async () => {
      const sebelum = await bacaStatistik();
      const dasborSebelum = await bacaDasborOpd();

      // Prasyarat: selama masih hidup, survei ini MEMANG terhitung. Tanpa
      // pemeriksaan ini, uji di bawah bisa "lulus" hanya karena surveinya tak
      // pernah masuk hitungan sejak awal.
      expect(jumlahNilai(sebelum, 1)).toBeGreaterThan(0);
      expect(sebelum.ikmTrend.some((t: { periode: string }) => t.periode === PERIODE)).toBe(true);
      expect(
        dasborSebelum.recentFeedback.some((f: { text: string }) => f.text === UMPAN_BALIK),
      ).toBe(true);

      const buang = await request(app.getHttpServer())
        .delete(`/api/v1/surveys/${surveiSampahId}`)
        .set(devHeaders({ role: Role.opd, userId: opdUserId, opdId }));
      expect(buang.status).toBe(200);

      const sesudah = await bacaStatistik();
      const dasborSesudah = await bacaDasborOpd();

      // 1. Respondennya berhenti dihitung -- tepat satu, bukan "berkurang".
      expect(sesudah.summary.totalRespondents).toBe(sebelum.summary.totalRespondents - 1);

      // 2. Jawaban skalanya berhenti dihitung.
      expect(jumlahNilai(sesudah, 1)).toBe(jumlahNilai(sebelum, 1) - 1);

      // 3. Titik trennya lenyap. Periode ini hanya dimiliki survei tersebut, jadi
      //    ketiadaannya tak dapat berasal dari survei lain.
      expect(sesudah.ikmTrend.some((t: { periode: string }) => t.periode === PERIODE)).toBe(false);

      // 4. Dasbor Admin OPD ikut berhenti menghitungnya, termasuk umpan balik
      //    terbaru yang mengutip jawaban teks survei yang sudah dibuang.
      expect(dasborSesudah.totalRespondents).toBe(dasborSebelum.totalRespondents - 1);
      expect(dasborSesudah.ikmTrend.some((t: { periode: string }) => t.periode === PERIODE)).toBe(
        false,
      );
      expect(
        dasborSesudah.recentFeedback.some((f: { text: string }) => f.text === UMPAN_BALIK),
      ).toBe(false);
    }, 60000);
  });
});
