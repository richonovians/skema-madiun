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
 * Pengalihan pengaduan antar-instansi (`PATCH /complaints/:id/alihkan`,
 * 5 November 2026).
 *
 * SETIAP permintaan membawa `userId` tersurat. `stub-auth.provider.ts` memakai
 * baku `x-dev-user-id` = 1 bila headernya tak dikirim, dan pengguna ber-id 1
 * tidak ada di `skm_uji` -- suite yang bersandar padanya lulus karena
 * kebetulan pada jalan pertama lalu memerah pada jalan kedua (terukur
 * 12 Oktober 2026 pada tiga suite lain).
 *
 * Tingkat OPD DITURUNKAN DARI NAMANYA (`tingkat-opd.util.ts`), jadi nama OPD
 * uji di bawah bukan hiasan: "Kecamatan ..." adalah satu-satunya cara membuat
 * baris OPD bertingkat kecamatan.
 */
describe('Alihkan pengaduan (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdAsalId: number;
  let opdTujuanId: number;
  let opdKecamatanId: number;
  let opdNonaktifId: number;
  let respondenId: number;
  let adminOpdAsalId: number;
  let adminOpdLainId: number;
  let adminKabId: number;

  const opdUji = async (kode: string, nama: string, isActive = true) => {
    const baris = await prisma.opd.upsert({
      where: { kode },
      update: { nama, isActive },
      create: { kode, nama, isActive },
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

    opdAsalId = await opdUji('E2EALH1', 'Dinas E2E Alihkan Asal');
    opdTujuanId = await opdUji('E2EALH2', 'Dinas E2E Alihkan Tujuan');
    opdKecamatanId = await opdUji('E2EALH3', 'Kecamatan E2E Alihkan');
    opdNonaktifId = await opdUji('E2EALH4', 'Dinas E2E Alihkan Nonaktif', false);

    respondenId = await penggunaUji('e2e-alh-resp', 'Responden Alihkan', [Role.responden]);
    adminOpdAsalId = await penggunaUji('e2e-alh-opd-asal', 'Admin OPD Asal', [Role.opd]);
    adminOpdLainId = await penggunaUji('e2e-alh-opd-lain', 'Admin OPD Lain', [Role.opd]);
    adminKabId = await penggunaUji('e2e-alh-kab', 'Admin Kabupaten Alihkan', [Role.kabupaten]);
  }, 60000);

  afterAll(async () => {
    const pelapor = { userId: respondenId };
    await prisma.complaintStatusHistory.deleteMany({ where: { complaint: pelapor } });
    await prisma.complaint.deleteMany({ where: pelapor });
    await bersihkanAuditAkunUji(prisma, [
      'e2e-alh-resp',
      'e2e-alh-opd-asal',
      'e2e-alh-opd-lain',
      'e2e-alh-kab',
    ]);
    await prisma.user.deleteMany({
      where: {
        ssoSubject: { in: ['e2e-alh-resp', 'e2e-alh-opd-asal', 'e2e-alh-opd-lain', 'e2e-alh-kab'] },
      },
    });
    await prisma.opd.deleteMany({
      where: { kode: { in: ['E2EALH1', 'E2EALH2', 'E2EALH3', 'E2EALH4'] } },
    });
    await app.close();
  }, 30000);

  const asRespondenPelapor = () => devHeaders({ role: Role.responden, userId: respondenId });
  const asOpdAsal = () => devHeaders({ role: Role.opd, opdId: opdAsalId, userId: adminOpdAsalId });
  const asOpdLain = () =>
    devHeaders({ role: Role.opd, opdId: opdTujuanId, userId: adminOpdLainId });
  const asKabupaten = () => devHeaders({ role: Role.kabupaten, userId: adminKabId });

  // `complaints.ticket_no` adalah VarChar(20) -- nomor uji harus muat, dan
  // tetap unik antar-uji maupun antar-jalan.
  let urutanTiket = 0;

  /** Satu pengaduan tingkat kabupaten milik `opdAsalId`, berikut baris riwayat pertamanya. */
  const buatPengaduan = async (over: Record<string, unknown> = {}) => {
    const nomor = `PGDALH${Date.now().toString(36)}${String(++urutanTiket).padStart(2, '0')}`;
    return prisma.complaint.create({
      data: {
        ticketNo: nomor,
        userId: respondenId,
        opdId: opdAsalId,
        tingkat: TingkatPengaduan.kabupaten,
        kategori: 'kab_lainnya',
        judul: '[UJI ALIHKAN] Jalan rusak',
        uraian: 'Uraian pengaduan uji pengalihan',
        tanggalKejadian: new Date('2026-11-01T00:00:00.000Z'),
        lokasiKejadian: 'Jl. Uji No. 1',
        status: ComplaintStatus.menunggu_verifikasi,
        statusHistory: { create: { status: ComplaintStatus.terkirim, actorId: null } },
        ...over,
      },
    });
  };

  const alihkan = (id: number, headers: Record<string, string>, body: Record<string, unknown>) =>
    request(app.getHttpServer()).patch(`/api/v1/complaints/${id}/alihkan`).set(headers).send(body);

  const badanSah = (opdId: number, kategori = 'kab_lainnya') => ({
    opdId,
    kategori,
    catatan: 'Berkaitan dengan kewenangan instansi lain.',
  });

  it('Admin OPD pemilik berhasil mengalihkan', async () => {
    const pengaduan = await buatPengaduan();

    const res = await alihkan(pengaduan.id, asOpdAsal(), badanSah(opdTujuanId)).expect(200);

    expect(res.body.data.opdId).toBe(opdTujuanId);
    expect(res.body.data.status).toBe(ComplaintStatus.dialihkan);
  });

  it('Admin Kabupaten boleh mengalihkan tiket OPD mana pun', async () => {
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asKabupaten(), badanSah(opdTujuanId)).expect(200);
  });

  /**
   * PASANGAN yang membuat dua uji di atas berarti: tanpa penolakan ini,
   * "berhasil" di atas bisa saja karena rutenya terbuka bagi siapa pun.
   */
  it('Admin OPD bukan pemilik ditolak', async () => {
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asOpdLain(), badanSah(opdKecamatanId)).expect(403);

    const sesudah = await prisma.complaint.findUnique({ where: { id: pengaduan.id } });
    expect(sesudah?.opdId).toBe(opdAsalId);
  });

  it('pelapor ditolak di lapis guard (403), bukan 400', async () => {
    // Bedanya penting: 400 akan berarti permintaannya sampai ke service dan
    // hanya badannya yang salah -- yaitu pelapor boleh memindahkan tiketnya
    // sendiri asal badannya benar.
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asRespondenPelapor(), badanSah(opdTujuanId)).expect(403);
  });

  it('riwayat bertambah tepat satu baris, bertujuan, dan status pengaduan ikut', async () => {
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asOpdAsal(), badanSah(opdTujuanId)).expect(200);

    const riwayat = await prisma.complaintStatusHistory.findMany({
      where: { complaintId: pengaduan.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(riwayat).toHaveLength(2);
    expect(riwayat[1]).toMatchObject({
      status: ComplaintStatus.dialihkan,
      opdTujuanId,
      actorId: adminOpdAsalId,
    });
    expect(riwayat[1].catatan?.startsWith('enc:v1:')).toBe(true);
  });

  /**
   * ALASAN KOLOM `opd_tujuan_id` ADA. `complaints.opd_id` hanya menyimpan
   * pemilik terakhir; tanpa baris riwayat yang membawa tujuannya sendiri,
   * instansi tujuan pertama hilang bagi pelapor begitu tiketnya dialihkan
   * untuk kedua kalinya.
   */
  it('pengalihan kedua tidak menghapus tujuan yang pertama', async () => {
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asOpdAsal(), badanSah(opdTujuanId)).expect(200);
    await alihkan(pengaduan.id, asKabupaten(), badanSah(opdKecamatanId, 'kec_lainnya')).expect(200);

    const riwayat = await prisma.complaintStatusHistory.findMany({
      where: { complaintId: pengaduan.id, status: ComplaintStatus.dialihkan },
      orderBy: { createdAt: 'asc' },
    });
    expect(riwayat.map((b) => b.opdTujuanId)).toEqual([opdTujuanId, opdKecamatanId]);
  });

  it('pengalihan lintas tingkat menulis tingkat baru beserta kategorinya', async () => {
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asKabupaten(), badanSah(opdKecamatanId, 'kec_lainnya')).expect(200);

    const sesudah = await prisma.complaint.findUnique({ where: { id: pengaduan.id } });
    expect(sesudah).toMatchObject({
      opdId: opdKecamatanId,
      tingkat: TingkatPengaduan.kecamatan,
      kategori: 'kec_lainnya',
    });
  });

  it('kategori yang bukan milik tingkat OPD tujuan ditolak 400', async () => {
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asKabupaten(), badanSah(opdKecamatanId, 'kab_lainnya')).expect(400);
  });

  it('OPD tujuan nonaktif ditolak 400', async () => {
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asKabupaten(), badanSah(opdNonaktifId)).expect(400);
  });

  it('pengaduan tanpa tujuan ditolak 400 dan diarahkan ke triase', async () => {
    const pengaduan = await buatPengaduan({ opdId: null });

    const res = await alihkan(pengaduan.id, asKabupaten(), badanSah(opdTujuanId)).expect(400);

    expect(String(res.body.message)).toMatch(/belum diteruskan ke OPD/i);
  });

  it.each([ComplaintStatus.selesai, ComplaintStatus.ditolak])(
    'pengaduan berstatus %s ditolak 400',
    async (status) => {
      const pengaduan = await buatPengaduan({ status });

      await alihkan(pengaduan.id, asKabupaten(), badanSah(opdTujuanId)).expect(400);
    },
  );

  it('catatan berisi spasi saja ditolak 400', async () => {
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asKabupaten(), {
      ...badanSah(opdTujuanId),
      catatan: '   ',
    }).expect(400);
  });

  it('audit_logs bertambah TEPAT SATU baris aksi alihkan', async () => {
    // Tepat satu, bukan dua: `@Audit` sengaja TIDAK dipasang di controller
    // karena service sudah mencatatnya sendiri dengan OPD lama dan kategori
    // lama, yang sudah hilang saat dekorator berjalan.
    const pengaduan = await buatPengaduan();

    await alihkan(pengaduan.id, asOpdAsal(), badanSah(opdTujuanId)).expect(200);

    const baris = await prisma.auditLog.findMany({
      where: { aksi: 'alihkan', entitas: 'complaint', actorId: adminOpdAsalId },
    });
    const untukTiketIni = baris.filter(
      (b) => (b.detail as { complaintId?: number } | null)?.complaintId === pengaduan.id,
    );
    expect(untukTiketIni).toHaveLength(1);
    expect(untukTiketIni[0].detail).toMatchObject({
      opdLama: opdAsalId,
      opdBaru: opdTujuanId,
    });
  });

  it('detail tiket mengirim nama instansi tujuan pada baris riwayatnya', async () => {
    const pengaduan = await buatPengaduan();
    await alihkan(pengaduan.id, asKabupaten(), badanSah(opdTujuanId)).expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/complaints/${pengaduan.ticketNo}`)
      .set(asKabupaten())
      .expect(200);

    const riwayat = res.body.data.statusHistory as {
      status: string;
      opdTujuanNama: string | null;
    }[];
    expect(riwayat.find((b) => b.status === ComplaintStatus.dialihkan)?.opdTujuanNama).toBe(
      'Dinas E2E Alihkan Tujuan',
    );
    // Baris yang bukan pengalihan TIDAK membawa nama instansi.
    expect(riwayat.find((b) => b.status === ComplaintStatus.terkirim)?.opdTujuanNama).toBeNull();
  });
});
