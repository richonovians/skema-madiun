import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PENANDA_DISUNTING } from '../src/common/interceptors/audit-redact.util';
import { AuditRetensiService } from '../src/modules/audit/audit-retensi.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * Retensi yang dipakai uji ini. Lihat alasan angkanya di beforeAll.
 */
const RETENSI_UJI_HARI = 3650;
/** Jauh lebih tua daripada seluruh data yang mungkin ada di basis data ini. */
const TANGGAL_PURBA = new Date('2015-01-01T00:00:00.000Z');

describe('Audit Log (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let opdUserId: number;

  const envAsli = { ...process.env };

  beforeAll(async () => {
    // WAJIB sebelum compile: ConfigModule memotret process.env dan memakai
    // `cache: true`, jadi menyetelnya di dalam `it` tak berpengaruh apa pun.
    //
    // 3650 HARI (sepuluh tahun), BUKAN 14, dan angka janggal ini justru
    // intinya. `pangkas()` bekerja pada SELURUH tabel — ia tak punya, dan tak
    // boleh punya, saringan "hanya baris milik uji ini". Dengan retensi 14 hari,
    // uji ini menghapus seluruh riwayat audit basis data pengembangan yang lebih
    // tua dari dua minggu; itu sudah benar-benar terjadi sekali (5.857 baris,
    // 30 September 2026) sebelum angka ini dinaikkan.
    //
    // Dengan batas sepuluh tahun, satu-satunya baris yang memenuhi syarat adalah
    // baris bertanggal 2015 yang dibuat uji ini sendiri — proyek ini tak punya
    // data sebelum 2026. Yang diuji tetap utuh: kueri sungguhan, batas `lt`,
    // penghapusan berkelompok, dan sifat "yang masih berlaku tidak disentuh".
    process.env.AUDIT_RETENTION_DAYS = String(RETENSI_UJI_HARI);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EAUD' },
      update: {},
      create: { kode: 'E2EAUD', nama: 'OPD E2E Audit', isActive: true },
    });
    opdId = opd.id;

    const opdUser = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-audit-opd' },
      update: {},
      create: {
        ssoSubject: 'e2e-audit-opd',
        nama: 'Admin OPD Audit',
        email: 'e2e-audit-opd@example.go.id',
        roles: [Role.opd],
        opdId,
      },
    });
    opdUserId = opdUser.id;
  }, 60000);

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: opdUserId } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.user.deleteMany({ where: { ssoSubject: 'e2e-audit-opd' } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EAUD' } });
    await app.close();
    process.env = envAsli;
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId, userId: opdUserId });
  /**
   * PEMBACA audit log kembali `kabupaten` sejak peleburan 15 September 2026
   * (sempat `superuser` sejak 20 Agustus 2026 -- dibereskan
   * 7 September 2026). Sejak keduanya dipisah (20 Agustus 2026),
   * `AuditService.assertSuperuser` menutup audit log bagi kabupaten -- di dalam
   * service, bukan lewat `@Roles`, karena RolesGuard memberi kedua peran itu
   * jalan pintas penuh atas dekorator tersebut. Tujuh uji di berkas ini merah
   * selama berminggu-minggu sebagai "kegagalan lama yang dimaklumi".
   */
  const kabupatenHeaders = () => devHeaders({ role: Role.kabupaten });

  it('POST /surveys (aksi tercatat) -> GET /audit-logs (Superuser) menampilkannya', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({
        judul: 'Survei Audit E2E',
        periode: '2026-Q2',
        jenis: 'custom',
        tujuan: 'kepuasan',
        metodeNilai: 'rata_rata',
      });
    expect(created.status).toBe(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey' })
      .set(kabupatenHeaders());

    expect(res.status).toBe(200);
    // PEGANGANNYA `periode`, BUKAN `judul` (22 September 2026). Uji ini dulu
    // mencari barisnya lewat judul survei -- yang berarti ia bersandar pada
    // kebocoran yang justru sedang ditutup: sejak `judul` masuk daftar redaksi,
    // nilainya tak lagi ada di `audit_logs.detail`. `periode` bukan data
    // pribadi, tetap terbaca, dan dibuat khas per uji agar tetap menunjuk satu
    // baris.
    const entry = (
      res.body.data as {
        actorId: number;
        actorNama: string;
        aksi: string;
        entitas: string;
        detail: { body?: { judul?: string; periode?: string } };
      }[]
    ).find((e) => e.detail?.body?.periode === '2026-Q2');

    expect(entry).toBeDefined();
    expect(entry?.aksi).toBe('create');
    expect(entry?.actorId).toBe(opdUserId);
    expect(entry?.actorNama).toBe('Admin OPD Audit');
    // Dan judulnya memang TIDAK ada di sana. Tanpa asersi ini, pergantian
    // pegangan di atas hanya memindahkan masalahnya tanpa ada yang menjaga.
    expect(entry?.detail?.body?.judul).toBe(PENANDA_DISUNTING);
  });

  it('PATCH status memakai aksi eksplisit "update_status" (bukan default "update")', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({
        judul: 'Survei Status Audit',
        periode: '2026-Q1',
        jenis: 'custom',
        tujuan: 'kepuasan',
        metodeNilai: 'rata_rata',
      });
    const id = created.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}/status`)
      .set(opdHeaders())
      .send({ status: 'aktif' });

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey' })
      .set(kabupatenHeaders());

    const entry = (res.body.data as { aksi: string; detail: { params?: { id?: string } } }[]).find(
      (e) => e.aksi === 'update_status' && String(e.detail?.params?.id) === String(id),
    );
    expect(entry).toBeDefined();
  });

  it('PATCH jenis memakai aksi eksplisit "ganti_jenis" (8 Oktober 2026)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei Ganti Jenis Audit', periode: '2026-Q1', jenis: 'skm_permenpanrb' });
    const id = created.body.data.id;

    const ganti = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}/jenis`)
      .set(opdHeaders())
      .send({ jenis: 'custom', tujuan: 'kepuasan', metodeNilai: 'rata_rata' });
    expect(ganti.status).toBe(200);

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey' })
      .set(kabupatenHeaders());
    const entry = (res.body.data as { aksi: string; detail: { params?: { id?: string } } }[]).find(
      (e) => e.aksi === 'ganti_jenis' && String(e.detail?.params?.id) === String(id),
    );
    expect(entry).toBeDefined();
  });

  it('DELETE survei tercatat dengan aksi "delete" (disimpulkan dari HTTP method)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({
        judul: 'Survei Hapus Audit',
        periode: '2026-Q1',
        jenis: 'custom',
        tujuan: 'kepuasan',
        metodeNilai: 'rata_rata',
      });
    const id = created.body.data.id;

    await request(app.getHttpServer()).delete(`/api/v1/surveys/${id}`).set(opdHeaders());

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey', actorId: opdUserId })
      .set(kabupatenHeaders());

    const entry = (res.body.data as { aksi: string; detail: { params?: { id?: string } } }[]).find(
      (e) => e.aksi === 'delete' && String(e.detail?.params?.id) === String(id),
    );
    expect(entry).toBeDefined();
  });

  it('GET /audit-logs (Admin OPD) -> 403 (hanya Admin Kabupaten)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/audit-logs').set(opdHeaders());
    expect(res.status).toBe(403);
  });

  it('GET /audit-logs (Responden) -> 403, pesannya menyebut peran yang dibutuhkan', async () => {
    // PASANGAN yang membuat uji "Superuser -> 200" di atas berarti. Tanpa ini,
    // 200 itu bisa saja karena endpointnya terbuka bagi peran mana pun.
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set(devHeaders({ role: Role.responden }));

    expect(res.status).toBe(403);
    expect(String(res.body.message)).toMatch(/kabupaten/i);
  });

  it('GET /audit-logs/:id (Admin OPD) -> 403 juga', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs/1')
      .set(devHeaders({ role: Role.opd, opdId: 1 }));

    expect(res.status).toBe(403);
  });

  it('GET /audit-logs (Responden) -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set(devHeaders({ role: Role.responden, userId: 1 }));
    expect(res.status).toBe(403);
  });

  it('filter actorId membatasi hasil ke satu pelaku', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ actorId: opdUserId })
      .set(kabupatenHeaders());

    expect(res.status).toBe(200);
    expect((res.body.data as { actorId: number }[]).every((e) => e.actorId === opdUserId)).toBe(
      true,
    );
  });

  it('aksi non-mutasi (GET) TIDAK tercatat ke audit log', async () => {
    await request(app.getHttpServer()).get('/api/v1/surveys').set(opdHeaders());

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ actorId: opdUserId })
      .set(kabupatenHeaders());

    const hasGetEntry = (res.body.data as { aksi: string }[]).some((e) => e.aksi === 'get');
    expect(hasGetEntry).toBe(false);
  });

  it('GET /audit-logs/:id (Superuser) mengembalikan satu entri sesuai id', async () => {
    await request(app.getHttpServer()).post('/api/v1/surveys').set(opdHeaders()).send({
      judul: 'Survei Detail Audit',
      periode: '2026-Q3',
      jenis: 'custom',
      tujuan: 'kepuasan',
      metodeNilai: 'rata_rata',
    });

    const list = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey', actorId: opdUserId })
      .set(kabupatenHeaders());
    // Lihat catatan pegangan `periode` pada uji pertama berkas ini.
    const entry = (
      list.body.data as { id: number; detail: { body?: { periode?: string } } }[]
    ).find((e) => e.detail?.body?.periode === '2026-Q3');
    expect(entry).toBeDefined();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/audit-logs/${entry?.id}`)
      .set(kabupatenHeaders());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(entry?.id);
    expect(res.body.data.actorNama).toBe('Admin OPD Audit');
  });

  it('GET /audit-logs/:id tidak ditemukan -> 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs/999999999')
      .set(kabupatenHeaders());
    expect(res.status).toBe(404);
  });

  it('GET /audit-logs/:id (Admin OPD) -> 403 (hanya Admin Kabupaten)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/audit-logs/1').set(opdHeaders());
    expect(res.status).toBe(403);
  });
  /**
   * RETENSI LOG AUDIT (30 September 2026, permintaan pengguna).
   *
   * DIUJI DI E2E, bukan sebagai uji unit controller, dan itu seluruh alasan
   * bagian ini ada di berkas ini: bahaya terbesarnya URUTAN RUTE. `@Get(':id')`
   * ber-ParseIntPipe akan menelan `/audit-logs/retensi` dan menjawab 400
   * "numeric string is expected" bila ia dideklarasikan lebih dulu. Uji unit
   * controller memanggil metodenya langsung, jadi ia lulus sempurna sementara
   * rutenya rusak di peramban.
   */
  describe('GET /audit-logs/retensi', () => {
    it('TIDAK ditelan rute :id, dan menyebut lama retensinya', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/retensi')
        .set(kabupatenHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ hari: RETENSI_UJI_HARI });
    });

    it('Admin OPD ditolak 403, sama seperti sisa log aktivitas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/retensi')
        .set(opdHeaders());

      expect(res.status).toBe(403);
    });
  });

  describe('pemangkasan sungguhan', () => {
    it('membuang baris kedaluwarsa dan MEMBIARKAN yang masih berlaku', async () => {
      // Uji yang paling penting dari seluruh fitur ini: penghapusannya permanen,
      // jadi yang harus dibuktikan bukan cuma "yang tua hilang" melainkan juga
      // "yang baru TIDAK hilang". Sebuah pemangkasan yang menyapu semuanya akan
      // lulus separuh pertama dengan gemilang.
      const tua = TANGGAL_PURBA;
      await prisma.auditLog.createMany({
        data: [
          { actorId: opdUserId, aksi: 'uji_tua', entitas: 'retensi', timestamp: tua },
          { actorId: opdUserId, aksi: 'uji_tua', entitas: 'retensi', timestamp: tua },
          { actorId: opdUserId, aksi: 'uji_baru', entitas: 'retensi' },
        ],
      });

      const service = app.get(AuditRetensiService);
      const hasil = await service.pangkas();

      expect(hasil).toMatchObject({
        dijalankan: true,
        kering: false,
        hari: RETENSI_UJI_HARI,
      });
      expect(await prisma.auditLog.count({ where: { actorId: opdUserId, aksi: 'uji_tua' } })).toBe(
        0,
      );
      expect(await prisma.auditLog.count({ where: { actorId: opdUserId, aksi: 'uji_baru' } })).toBe(
        1,
      );
    });

    it('mode kering menghitung TANPA menghapus', async () => {
      const tua = TANGGAL_PURBA;
      await prisma.auditLog.create({
        data: { actorId: opdUserId, aksi: 'uji_kering', entitas: 'retensi', timestamp: tua },
      });

      const service = app.get(AuditRetensiService);
      const hasil = await service.pangkas({ kering: true });

      expect(hasil).toMatchObject({ dijalankan: true, kering: true });
      expect((hasil as { jumlah: number }).jumlah).toBeGreaterThanOrEqual(1);
      expect(
        await prisma.auditLog.count({ where: { actorId: opdUserId, aksi: 'uji_kering' } }),
      ).toBe(1);
    });
  });
});
