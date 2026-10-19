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

/**
 * Kunci singgahan `GET /statistics`, disalin dari `dashboard.service.ts`.
 * Endpoint itu dibungkus singgahan ber-TTL 60 detik TANPA invalidasi, jadi
 * uji apa pun yang mengubah data lalu membaca ulang endpoint ini WAJIB
 * membuangnya lebih dulu -- kalau tidak, yang terukur adalah singgahan.
 */
const KUNCI_SINGGAHAN_STATISTIK = 'statistik-publik';

describe('Dashboard & Statistics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let singgahan: PenyimpanSinggahan;
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
    singgahan = app.get<PenyimpanSinggahan>(PENYIMPAN_SINGGAHAN, { strict: false });

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

      // UJI INI GOYAH ANTAR-JALAN SEBELUM BARIS INI ADA (19 Oktober 2026).
      //
      // `afterAll` MENGHAPUS baris OPD `E2EDASH`, jadi `upsert` pada jalan
      // berikutnya mencetak id BARU dari sekuens. Sementara itu muatan
      // singgahan 60 detik masih memuat id jalan sebelumnya, sehingga
      // `topOpd.find(o => o.opdId === opdId)` tak menemukan apa pun dan
      // kegagalannya terbaca seperti cacat produksi, padahal cacat uji.
      //
      // Mekanismenya DIUKUR, bukan disimpulkan: `singgahan:statistik-publik`
      // berisi `topOpd: [{ opdId: 755, ... }]` sementara `opd_id_seq` sudah di
      // 755 dan baris 755 tak ada lagi di tabel `opd` -- jalan berikutnya
      // mendapat 756.
      //
      // Terukur juga akibatnya, empat jalan beruntun: DENGAN baris ini lulus
      // dua kali (singgahan dingin lalu hangat), TANPA baris ini gagal dua kali
      // (keduanya hangat). Jalan dengan singgahan yang benar-benar kedaluwarsa
      // tidak diukur; riwayat hijau suite inilah buktinya ia lulus di sana.
      //
      // Akibat keduanya: APA yang diuji bergantung pada keadaan singgahan.
      // Dengan singgahan dingin ia memang membaca baris `ikm_results` yang
      // lahir saat survei ditutup; dengan singgahan hangat ia membaca muatan
      // lama dan tak menyentuh jalur itu sama sekali. Baris ini membuat
      // jawabannya satu, bukan dua.
      await singgahan.hapus(KUNCI_SINGGAHAN_STATISTIK);
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
   * Penyisiran 19 Oktober 2026 menemukan TUJUH tempat, dan blok ini menjaga
   * setiap keluaran yang dapat dibaca dari luar:
   *
   *  1. `summary.totalRespondents` -- `surveyResponse.count()` tanpa penyaring.
   *  2. `valueDistribution`        -- `answer.groupBy` tanpa penyaring survei.
   *  3. `ikmTrend`                 -- dari `ikmResult` tanpa penyaring.
   *  4. `summary.ikm`              -- query `ikmResult` yang sama.
   *  5. `serviceElements`          -- query `ikmResult` yang sama.
   *  6. `topOpd`                   -- query `ikmResult` yang sama.
   *  7. Dasbor Admin OPD           -- jumlah responden, riwayat IKM, umpan balik
   *                                   terbaru, dan persentase tren responden.
   *
   * Butir 4 sampai 6 ikut diuji karena satu query `ikmResult` memberi EMPAT
   * keluaran sekaligus; menguji `ikmTrend` saja membuat tiga keluaran lain
   * tampak terjaga padahal tak ada yang menyebutnya.
   *
   * BENTUKNYA BEFORE/AFTER DI `beforeAll`, BUKAN SATU UJI RAKSASA. Membuang
   * survei adalah transisi sekali jalan: begitu ia di Sampah, keadaan "sebelum"
   * tak dapat dibaca lagi. Jadi kedua potret diambil sekali di `beforeAll`, dan
   * tiap `it` di bawah hanya membandingkan dua potret itu. Dengan begitu satu uji
   * menjaga satu keluaran, dan kegagalannya menyebut keluaran MANA yang bocor --
   * bukan berhenti pada pernyataan pertama yang gagal lalu menyembunyikan sisanya.
   *
   * DUA RESPONS, DAN YANG KEDUA BERTANGGAL BULAN LALU.
   * `getRespondentTrendPercent` membandingkan bulan kalender ini dengan bulan
   * lalu, dan mengembalikan `null` begitu bulan lalu nol -- jadi tanpa satu
   * respons bertanggal bulan lalu, angka itu selalu `null` dan tak membuktikan
   * apa pun. Tanggalnya dihitung dengan rumus yang sama seperti kode
   * produksinya, sehingga hasil uji ini tidak bergantung pada kapan ia
   * dijalankan. Kedua respons menjawab `nilai: 1` supaya nilai IKM surveinya
   * tetap 25: respons TANPA jawaban akan mengencerkan NRR, karena rumusnya
   * `jumlah nilai / jumlah RESPONS`, bukan dibagi jumlah jawaban.
   *
   * ANGKA 25 DAN 62,5 BUKAN TEBAKAN. OPD `E2EDASH` milik berkas ini sendiri,
   * dan saat blok ini berjalan `ikm_results` hanya memuat snapshot survei
   * bersama (IKM 100, ditutup oleh uji topOpd di atas). Survei di sini bernilai
   * 25 -- nilai terkecil yang mungkin, semua jawaban 1 -- sehingga peringkat OPD
   * ini berbunyi (100 + 25) / 2 = 62,5 selagi survei itu hidup, dan kembali ke
   * 100 begitu ia dibuang.
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
    /** Dua respons bernilai 1 -> NRR 1 -> 1 x 25. Nilai IKM terkecil yang mungkin. */
    const IKM_SURVEI_SAMPAH = 25;
    /** Nilai IKM survei bersama di `beforeAll` luar, sesudah ditutup uji topOpd. */
    const IKM_SURVEI_BERSAMA = 100;

    type Titik = { periode: string; value: number };
    type Statistik = {
      summary: { totalRespondents: number; ikm: number };
      ikmTrend: Titik[];
      valueDistribution: { value: number; count: number }[];
      serviceElements: { code: string; avgNrr: number }[];
      topOpd: { opdId: number; opdNama: string; nilaiIkm: number }[];
    };
    type Dasbor = {
      totalRespondents: number;
      respondentTrendPercent: number | null;
      ikmTrend: Titik[];
      recentFeedback: { text: string }[];
    };

    let surveiSampahId: number;
    let sebelum: Statistik;
    let sesudah: Statistik;
    let dasborSebelum: Dasbor;
    let dasborSesudah: Dasbor;
    let snapshotSampah: { periode: string } | null;

    const bacaStatistik = async (): Promise<Statistik> => {
      // Tanpa ini, pembacaan kedua dijawab singgahan 60 detik dan ujinya
      // mengukur singgahan alih-alih penyaringnya.
      await singgahan.hapus(KUNCI_SINGGAHAN_STATISTIK);
      const res = await request(app.getHttpServer()).get('/api/v1/statistics');
      expect(res.status).toBe(200);
      return res.body.data as Statistik;
    };

    const bacaDasborOpd = async (): Promise<Dasbor> => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/opd')
        .set(devHeaders({ role: Role.opd, userId: opdUserId, opdId }));
      expect(res.status).toBe(200);
      return res.body.data as Dasbor;
    };

    const jumlahNilai = (data: Statistik, nilai: number) =>
      data.valueDistribution.find((v) => v.value === nilai)?.count ?? 0;

    const nrrUnsur = (data: Statistik, kode: string) =>
      data.serviceElements.find((u) => u.code === kode)?.avgNrr ?? null;

    const peringkatOpd = (data: Statistik) => data.topOpd.find((o) => o.opdId === opdId);

    const adaPeriode = (titik: Titik[]) => titik.some((t) => t.periode === PERIODE);

    beforeAll(async () => {
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

      const sekarang = new Date();
      // Rumus yang SAMA dengan `getRespondentTrendPercent`, supaya "bulan lalu"
      // di sini dan di kode produksi selalu bulan yang sama -- termasuk saat
      // bulan ini Januari, ketika `getMonth() - 1` berpindah ke tahun lalu.
      const pertengahanBulanLalu = new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 15);

      const responsBulanIni = await prisma.surveyResponse.create({
        data: { surveyId: survei.id },
      });
      const responsBulanLalu = await prisma.surveyResponse.create({
        data: { surveyId: survei.id, submittedAt: pertengahanBulanLalu },
      });
      await prisma.answer.createMany({
        data: [
          // Nilai 1 dipilih supaya jejaknya pada `valueDistribution` dan pada IKM
          // tak dapat tertukar dengan jawaban survei bersama (yang bernilai 4).
          { responseId: responsBulanIni.id, questionId: skala.id, nilai: 1 },
          { responseId: responsBulanIni.id, questionId: teks.id, teks: UMPAN_BALIK },
          { responseId: responsBulanLalu.id, questionId: skala.id, nilai: 1 },
        ],
      });

      sebelum = await bacaStatistik();
      dasborSebelum = await bacaDasborOpd();

      const buang = await request(app.getHttpServer())
        .delete(`/api/v1/surveys/${surveiSampahId}`)
        .set(devHeaders({ role: Role.opd, userId: opdUserId, opdId }));
      expect(buang.status).toBe(200);

      sesudah = await bacaStatistik();
      dasborSesudah = await bacaDasborOpd();
      snapshotSampah = await prisma.ikmResult.findFirst({
        where: { surveyId: surveiSampahId },
        select: { periode: true },
      });
    }, 60000);

    it('prasyarat: selagi hidup, survei ini MEMANG ikut dihitung di tiap keluaran', () => {
      // Tanpa uji ini, seluruh uji di bawah dapat "lulus" semata karena
      // surveinya tak pernah masuk hitungan sejak awal.
      expect(jumlahNilai(sebelum, 1)).toBeGreaterThan(0);
      expect(adaPeriode(sebelum.ikmTrend)).toBe(true);
      expect(peringkatOpd(sebelum)?.nilaiIkm).toBe(
        (IKM_SURVEI_BERSAMA + IKM_SURVEI_SAMPAH) / 2, // 62,5
      );
      expect(dasborSebelum.recentFeedback.some((f) => f.text === UMPAN_BALIK)).toBe(true);
      // Dua respons bulan ini (survei bersama + survei ini) vs satu bulan lalu.
      expect(dasborSebelum.respondentTrendPercent).toBe(100);
    });

    /**
     * PRASYARAT KEDUA, UNTUK RIWAYAT IKM DASBOR OPD SAJA.
     *
     * Riwayat itu dibaca dari SNAPSHOT `ikm_results`, bukan dihitung langsung
     * seperti statistik publik. Jadi periode survei ini belum pernah muncul di
     * sana selagi surveinya masih aktif, dan "hilangnya" sesudah dibuang tak
     * membuktikan apa pun -- kecuali barisnya memang ada untuk dihitung.
     *
     * Barisnya ada, dan justru lahir pada saat pembuangan: `SurveysService.remove`
     * memanggil `ikmService.snapshot()` tepat ketika survei masuk Sampah. Jadi
     * satu-satunya yang menahan baris itu keluar dari dasbor adalah penyaringnya.
     *
     * Prasyarat ini DIPISAH dan bukan digabung ke atas karena ia dibaca SESUDAH
     * pembuangan, bukan sebelum -- menggabungkannya akan menyesatkan pembaca
     * berikutnya tentang kapan keadaan itu berlaku.
     */
    it('prasyarat: snapshot IKM survei itu memang ada sesudah ia dibuang', () => {
      expect(snapshotSampah).not.toBeNull();
      expect(snapshotSampah?.periode).toBe(PERIODE);
    });

    it('summary.totalRespondents berhenti menghitung kedua respons survei itu', () => {
      expect(sesudah.summary.totalRespondents).toBe(sebelum.summary.totalRespondents - 2);
    });

    it('valueDistribution berhenti menghitung kedua jawaban skalanya', () => {
      expect(jumlahNilai(sesudah, 1)).toBe(jumlahNilai(sebelum, 1) - 2);
    });

    it('ikmTrend kehilangan titik periodenya', () => {
      // Periode `2029-Q3` hanya dimiliki survei ini, jadi ketiadaannya tak dapat
      // berasal dari survei lain.
      expect(adaPeriode(sesudah.ikmTrend)).toBe(false);
    });

    it('summary.ikm naik, karena nilai terendah berhenti menariknya ke bawah', () => {
      // Arahnya pasti secara aritmetika, bukan tebakan atas isi seed: membuang
      // satu anggota yang berada DI BAWAH rata-rata selalu menaikkan
      // rata-ratanya. Prasyaratnya ditulis tersurat -- bila rata-rata sebelumnya
      // justru 25, kenaikan itu tak dapat dituntut.
      expect(sebelum.summary.ikm).toBeGreaterThan(IKM_SURVEI_SAMPAH);
      expect(sesudah.summary.ikm).toBeGreaterThan(sebelum.summary.ikm);
    });

    it('serviceElements U1 naik, karena NRR 1 berhenti ikut dirata-rata', () => {
      const nrrSebelum = nrrUnsur(sebelum, 'U1');
      const nrrSesudah = nrrUnsur(sesudah, 'U1');
      if (nrrSebelum === null || nrrSesudah === null) {
        throw new Error('U1 harus hadir di serviceElements sebelum maupun sesudah');
      }
      // Alasan yang sama seperti `summary.ikm`: 1 adalah NRR terkecil yang
      // mungkin, jadi membuangnya hanya dapat menaikkan rata-ratanya.
      expect(nrrSebelum).toBeGreaterThan(1);
      expect(nrrSesudah).toBeGreaterThan(nrrSebelum);
    });

    it('topOpd mengembalikan peringkat OPD ini ke nilai tanpa survei Sampah', () => {
      expect(peringkatOpd(sesudah)?.nilaiIkm).toBe(IKM_SURVEI_BERSAMA);
    });

    it('dasbor Admin OPD berhenti menghitung responden, riwayat IKM, dan umpan baliknya', () => {
      expect(dasborSesudah.totalRespondents).toBe(dasborSebelum.totalRespondents - 2);
      expect(adaPeriode(dasborSesudah.ikmTrend)).toBe(false);
      expect(dasborSesudah.recentFeedback.some((f) => f.text === UMPAN_BALIK)).toBe(false);
    });

    it('respondentTrendPercent berhenti memakai respons survei Sampah', () => {
      // Begitu kedua respons survei ini berhenti dihitung, bulan lalu menjadi nol
      // dan fungsinya memang mengembalikan `null` untuk menghindari angka
      // menyesatkan. Itu perilaku yang sudah ada, bukan yang diubah di sini;
      // yang diuji adalah bahwa respons survei Sampah tak lagi ikut.
      expect(dasborSesudah.respondentTrendPercent).toBeNull();
    });
  });
});
