import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { BATAS_HARIAN_PENGADUAN_BAKU } from '../src/modules/complaints/complaints.constants';
import { bersihkanAuditAkunUji } from './helpers/audit.helper';
import { devHeaders } from './helpers/auth.helper';

/**
 * Batas harian pengaduan per AKUN (14 September 2026).
 *
 * Batas laju per menit tak cukup: ia menahan ledakan, bukan ketekunan. Satu
 * akun yang mengirim sepuluh pengaduan tiap menit sepanjang hari tak pernah
 * menyentuh batas 100/menit, tetapi membanjiri antrean triase dan --
 * karena tiap pengaduan menyebar notifikasi ke seluruh Admin OPD tujuan dan
 * seluruh Admin Kabupaten -- mengalikan ongkosnya di sisi penerima.
 *
 * Dihitung dari BASIS DATA, bukan dari penghitung throttle: penghitung itu
 * disimpan di memori dan hilang setiap kali proses dimulai ulang, sehingga
 * "batas harian" yang bersandar padanya dapat disetel ulang dengan menunggu
 * deploy berikutnya.
 */
const SSO_PELAPOR = 'e2e-batas-harian-1';
const SSO_PELAPOR_LAIN = 'e2e-batas-harian-2';

describe('Batas harian pengaduan per akun (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let pelaporId: number;
  let pelaporLainId: number;

  const buatPengaduanLangsung = (userId: number, kapan: Date, urutan: number) =>
    prisma.complaint.create({
      data: {
        // Ditulis lewat Prisma, bukan lewat HTTP: yang diuji adalah
        // penghitungnya, dan sepuluh permintaan HTTP hanya menambah waktu
        // beserta sepuluh baris audit yang kemudian harus dibersihkan.
        ticketNo: `E2EBH${urutan}${Date.now().toString().slice(-6)}`,
        userId,
        opdId,
        kategori: 'aduan',
        judul: `Pengaduan lama ${urutan}`,
        uraian: 'Disemai langsung untuk menguji batas harian.',
        createdAt: kapan,
      },
    });

  beforeAll(async () => {
    // Dipaksa ke nilai baku: berkas ini menguji BATASNYA, jadi ia tak boleh
    // ikut berubah mengikuti `.env` milik siapa pun yang menjalankannya.
    process.env.COMPLAINT_DAILY_LIMIT = String(BATAS_HARIAN_PENGADUAN_BAKU);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.create({
      data: { kode: 'E2EBH', nama: 'OPD Uji Batas Harian', isActive: true },
    });
    opdId = opd.id;

    const pelapor = await prisma.user.create({
      data: {
        ssoSubject: SSO_PELAPOR,
        nama: 'Pelapor Batas Harian',
        email: 'batas-harian@e2e.test',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    pelaporId = pelapor.id;

    const lain = await prisma.user.create({
      data: {
        ssoSubject: SSO_PELAPOR_LAIN,
        nama: 'Pelapor Lain',
        email: 'batas-harian-lain@e2e.test',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    pelaporLainId = lain.id;
  }, 30000);

  afterAll(async () => {
    await prisma.complaint.deleteMany({ where: { userId: { in: [pelaporId, pelaporLainId] } } });
    await bersihkanAuditAkunUji(prisma, [SSO_PELAPOR, SSO_PELAPOR_LAIN]);
    await prisma.user.deleteMany({
      where: { ssoSubject: { in: [SSO_PELAPOR, SSO_PELAPOR_LAIN] } },
    });
    await prisma.opd.deleteMany({ where: { kode: 'E2EBH' } });
    await app.close();
  }, 30000);

  const kirim = (userId: number) =>
    request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(devHeaders({ role: Role.responden, userId }))
      .field('opdId', opdId)
      .field('kategori', 'aduan')
      .field('judul', 'Pengaduan baru')
      .field('uraian', 'Isi pengaduan yang cukup panjang untuk lolos validasi.');

  it(`menolak pengaduan ke-${BATAS_HARIAN_PENGADUAN_BAKU + 1} pada hari yang sama`, async () => {
    for (let i = 0; i < BATAS_HARIAN_PENGADUAN_BAKU; i++) {
      await buatPengaduanLangsung(pelaporId, new Date(), i);
    }

    const res = await kirim(pelaporId);

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('BATAS_HARIAN_PENGADUAN');
    // Pesannya harus dapat dimengerti pelapornya: menyebut angkanya, bukan
    // sekadar "terlalu banyak permintaan".
    expect(res.body.message).toMatch(new RegExp(String(BATAS_HARIAN_PENGADUAN_BAKU)));
  });

  /**
   * Kendali. Batas yang keliru dihitung lintas-akun akan menghukum warga yang
   * tak melakukan apa pun, dan itu tak terlihat dari uji di atas.
   */
  it('akun lain pada hari yang sama tetap dilayani', async () => {
    const res = await kirim(pelaporLainId);

    expect(res.status).toBe(201);
  });

  /**
   * Kendali kedua. Tanpa ini, penghitung yang lupa menyaring tanggal akan
   * mengunci akun SELAMANYA sesudah sepuluh pengaduan pertamanya seumur hidup.
   */
  it('pengaduan kemarin tidak ikut dihitung', async () => {
    const kemarin = new Date(Date.now() - 26 * 60 * 60 * 1000);
    for (let i = 0; i < BATAS_HARIAN_PENGADUAN_BAKU; i++) {
      await buatPengaduanLangsung(pelaporLainId, kemarin, 100 + i);
    }

    const res = await kirim(pelaporLainId);

    expect(res.status).toBe(201);
  });
});
