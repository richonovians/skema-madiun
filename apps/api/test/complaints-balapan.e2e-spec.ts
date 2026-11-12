import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintStatus, Role, TingkatPengaduan } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';
import { bersihkanAuditAkunUji } from './helpers/audit.helper';

/**
 * BUG-078 (5 November 2026): permintaan serentak menimpa status pengaduan.
 *
 * `updateStatus`, `alihkan`, dan `forward` memeriksa keadaan tiket lebih
 * dahulu, lalu menulis dengan syarat `where: { id }` saja. Dua permintaan yang
 * sama-sama membaca keadaan lama keduanya lolos pemeriksaan dan keduanya
 * menulis: tiket `selesai` terbuka lagi menjadi `dialihkan`, riwayat memuat
 * dua perpindahan yang sama, dan pelapor dikabari dua kali.
 *
 * SETIAP SKENARIO DIULANG BEBERAPA PUTARAN. Balapan tak dapat dipaksa terjadi
 * dari luar proses; satu putaran yang kebetulan berurutan akan lulus juga pada
 * kode yang cacat. Beberapa putaran membuat merahnya pasti tertangkap.
 *
 * Yang kalah boleh menjawab 409 ATAU 400. 409 bila ia membaca keadaan lama lalu
 * kalah saat menulis; 400 bila ia baru membaca sesudah pemenangnya selesai,
 * sehingga perpindahannya memang tak lagi diizinkan. Keduanya benar -- yang
 * salah hanyalah dua 200.
 *
 * SETIAP permintaan membawa `userId` tersurat; lihat catatan di
 * `alihkan-pengaduan.e2e-spec.ts`.
 */
describe('Balapan perubahan pengaduan (e2e, BUG-078)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdAsalId: number;
  let opdSatuId: number;
  let opdDuaId: number;
  let respondenId: number;
  let adminKabId: number;

  const PUTARAN = 5;
  const AKUN = ['e2e-blp-resp', 'e2e-blp-kab'];
  const KODE_OPD = ['E2EBLP1', 'E2EBLP2', 'E2EBLP3'];
  // Penanda nomor tiket, dipakai juga untuk menyapu notifikasi: penerimanya
  // bukan hanya akun uji, melainkan seluruh Admin Kabupaten di basis data.
  const AWALAN_TIKET = 'PGDBLP';

  const opdUji = async (kode: string, nama: string) => {
    const baris = await prisma.opd.upsert({
      where: { kode },
      update: { nama, isActive: true },
      create: { kode, nama, isActive: true },
    });
    return baris.id;
  };

  const penggunaUji = async (ssoSubject: string, nama: string, roles: Role[]) => {
    const baris = await prisma.user.upsert({
      where: { ssoSubject },
      update: { consentAt: new Date() },
      create: {
        ssoSubject,
        nama,
        email: `${ssoSubject}@example.go.id`,
        roles,
        consentAt: new Date(),
      },
    });
    return baris.id;
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    opdAsalId = await opdUji('E2EBLP1', 'Dinas E2E Balapan Asal');
    opdSatuId = await opdUji('E2EBLP2', 'Dinas E2E Balapan Satu');
    opdDuaId = await opdUji('E2EBLP3', 'Dinas E2E Balapan Dua');

    respondenId = await penggunaUji('e2e-blp-resp', 'Responden Balapan', [Role.responden]);
    adminKabId = await penggunaUji('e2e-blp-kab', 'Admin Kabupaten Balapan', [Role.kabupaten]);
  }, 60000);

  afterAll(async () => {
    const pelapor = { userId: respondenId };
    await prisma.notification.deleteMany({ where: { message: { contains: AWALAN_TIKET } } });
    await prisma.complaintStatusHistory.deleteMany({ where: { complaint: pelapor } });
    await prisma.complaint.deleteMany({ where: pelapor });
    await bersihkanAuditAkunUji(prisma, AKUN);
    await prisma.user.deleteMany({ where: { ssoSubject: { in: AKUN } } });
    await prisma.opd.deleteMany({ where: { kode: { in: KODE_OPD } } });
    await app.close();
  }, 30000);

  // Admin Kabupaten untuk SEMUA pelaku: Admin OPD asal yang kalah sesudah
  // tiketnya dialihkan akan ditolak 403 karena tiketnya bukan miliknya lagi,
  // dan penolakan itu menutupi apa yang sedang diukur di sini.
  const asKabupaten = () => devHeaders({ role: Role.kabupaten, userId: adminKabId });

  let urutanTiket = 0;

  const buatPengaduan = async (over: Record<string, unknown> = {}) => {
    const nomor = `${AWALAN_TIKET}${Date.now().toString(36)}${String(++urutanTiket).padStart(2, '0')}`;
    return prisma.complaint.create({
      data: {
        ticketNo: nomor,
        userId: respondenId,
        opdId: opdAsalId,
        tingkat: TingkatPengaduan.kabupaten,
        kategori: 'kab_lainnya',
        judul: '[UJI BALAPAN] Jalan rusak',
        uraian: 'Uraian pengaduan uji balapan',
        tanggalKejadian: new Date('2026-11-01T00:00:00.000Z'),
        lokasiKejadian: 'Jl. Uji No. 1',
        status: ComplaintStatus.menunggu_verifikasi,
        statusHistory: { create: { status: ComplaintStatus.terkirim, actorId: null } },
        ...over,
      },
    });
  };

  const ubahStatus = (id: number, status: ComplaintStatus, catatan?: string) =>
    request(app.getHttpServer())
      .patch(`/api/v1/complaints/${id}/status`)
      .set(asKabupaten())
      .send(catatan ? { status, catatan } : { status });

  const alihkan = (id: number, opdId: number) =>
    request(app.getHttpServer())
      .patch(`/api/v1/complaints/${id}/alihkan`)
      .set(asKabupaten())
      .send({ opdId, kategori: 'kab_lainnya', catatan: 'Berkaitan dengan kewenangan lain.' });

  const teruskan = (id: number, opdId: number) =>
    request(app.getHttpServer())
      .patch(`/api/v1/complaints/${id}/opd`)
      .set(asKabupaten())
      .send({ opdId });

  /** Baris riwayat SESUDAH baris `terkirim` yang dibuat `buatPengaduan`. */
  const riwayatPerpindahan = (complaintId: number) =>
    prisma.complaintStatusHistory.findMany({
      where: { complaintId, status: { not: ComplaintStatus.terkirim } },
      orderBy: { createdAt: 'asc' },
    });

  const kodeKalah = [400, 409];

  it('selesai melawan alihkan: hanya satu yang menang, dan riwayatnya satu baris', async () => {
    for (let i = 0; i < PUTARAN; i++) {
      const tiket = await buatPengaduan({ status: ComplaintStatus.sedang_ditindaklanjuti });

      const [resStatus, resAlihkan] = await Promise.all([
        ubahStatus(tiket.id, ComplaintStatus.selesai),
        alihkan(tiket.id, opdSatuId),
      ]);

      const kode = [resStatus.status, resAlihkan.status];
      expect(kode.filter((k) => k === 200)).toHaveLength(1);
      expect(kodeKalah).toContain(kode.find((k) => k !== 200));

      const riwayat = await riwayatPerpindahan(tiket.id);
      expect(riwayat).toHaveLength(1);

      const sesudah = await prisma.complaint.findUnique({ where: { id: tiket.id } });
      const pemenang =
        resStatus.status === 200 ? ComplaintStatus.selesai : ComplaintStatus.dialihkan;
      expect(sesudah?.status).toBe(pemenang);
      expect(riwayat[0].status).toBe(pemenang);
    }
  });

  it('empat perpindahan serentak ke diverifikasi: satu menang, satu baris riwayat, satu kabar', async () => {
    for (let i = 0; i < PUTARAN; i++) {
      const tiket = await buatPengaduan();

      const hasil = await Promise.all(
        Array.from({ length: 4 }, () => ubahStatus(tiket.id, ComplaintStatus.diverifikasi)),
      );

      const kode = hasil.map((r) => r.status);
      expect(kode.filter((k) => k === 200)).toHaveLength(1);
      for (const k of kode.filter((k) => k !== 200)) expect(kodeKalah).toContain(k);

      expect(await riwayatPerpindahan(tiket.id)).toHaveLength(1);

      const kabarPelapor = await prisma.notification.count({
        where: { userId: respondenId, link: `/complaints/${tiket.ticketNo}` },
      });
      expect(kabarPelapor).toBe(1);
    }
  });

  /**
   * DUA PENGALIHAN BOLEH SAMA-SAMA BERHASIL bila keduanya berurutan: tiket
   * `dialihkan` memang boleh dialihkan lagi. Yang tak boleh adalah dua
   * pengalihan yang BERANGKAT DARI PEMILIK YANG SAMA -- artinya yang kedua
   * menimpa yang pertama tanpa pernah melihatnya, dan OPD tujuan pertama
   * kehilangan tiket tanpa dikabari.
   */
  it('dua pengalihan ke tujuan berbeda: tak ada dua yang berangkat dari pemilik yang sama', async () => {
    for (let i = 0; i < PUTARAN; i++) {
      const tiket = await buatPengaduan();

      const hasil = await Promise.all([alihkan(tiket.id, opdSatuId), alihkan(tiket.id, opdDuaId)]);

      const menang = hasil.filter((r) => r.status === 200).length;
      expect(menang).toBeGreaterThanOrEqual(1);
      for (const r of hasil.filter((r) => r.status !== 200)) expect(kodeKalah).toContain(r.status);

      const riwayat = await riwayatPerpindahan(tiket.id);
      expect(riwayat).toHaveLength(menang);

      const audit = await prisma.auditLog.findMany({
        where: { aksi: 'alihkan', entitas: 'complaint', actorId: adminKabId },
      });
      const untukTiketIni = audit
        .map((b) => b.detail as { complaintId?: number; opdLama?: number } | null)
        .filter((d) => d?.complaintId === tiket.id);
      expect(untukTiketIni).toHaveLength(menang);
      const asal = untukTiketIni.map((d) => d?.opdLama);
      expect(new Set(asal).size).toBe(asal.length);
    }
  });

  it('dua penerusan ke OPD berbeda: hanya satu yang menang, dan tujuannya milik pemenang', async () => {
    for (let i = 0; i < PUTARAN; i++) {
      const tiket = await buatPengaduan({ opdId: null });

      const [resSatu, resDua] = await Promise.all([
        teruskan(tiket.id, opdSatuId),
        teruskan(tiket.id, opdDuaId),
      ]);

      const kode = [resSatu.status, resDua.status];
      expect(kode.filter((k) => k === 200)).toHaveLength(1);
      expect(kodeKalah).toContain(kode.find((k) => k !== 200));

      const sesudah = await prisma.complaint.findUnique({ where: { id: tiket.id } });
      expect(sesudah?.opdId).toBe(resSatu.status === 200 ? opdSatuId : opdDuaId);
    }
  });
});
