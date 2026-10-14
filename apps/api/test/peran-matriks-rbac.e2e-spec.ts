import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { devHeaders } from './helpers/auth.helper';

/**
 * TIGA BARIS MATRIKS TC-RBAC YANG BENAR MENURUT KODE, TAPI TAK PERNAH DIUJI.
 *
 * Pemetaan cakupan 14 Oktober 2026 menemukan TC-RBAC-008, 009, dan 011 benar
 * menurut `@Roles(Role.responden)` di controllernya -- dan tak punya satu pun
 * uji yang membuktikannya. Benar menurut kode bukan sama dengan terbukti:
 * dekorator yang kelak dicabut tak akan memerahkan apa pun, dan ketiga rute itu
 * menerima JAWABAN SURVEI dan ISI PENGADUAN, yang artinya gerbangnya yang
 * menjaga agar admin tak pernah bisa mengisi atas nama warga.
 *
 * PESAN penolakannya ikut diperiksa, bukan hanya status 403. Itu bukan
 * kerewelan, melainkan pelajaran terukur dari `peran-kabupaten-penuh.e2e-spec.ts`:
 * uji mutasi di sana membuktikan bahwa MELEPAS `@Roles` dari controller sama
 * sekali tidak memerahkan uji yang cuma memeriksa statusnya, karena lapis
 * berikutnya menangkapnya dan menjawab 403 juga. Bentuk itu sudah ada di repo
 * ini: `responses.e2e-spec.ts:277` menguji rute respons bagi Admin OPD dan
 * berhenti di status, jadi ia tetap hijau walau gerbang perannya hilang.
 *
 * MUTASI YANG MEMBUKTIKAN KETIGANYA, 14 Oktober 2026. Ketiga uji ini menguji
 * perilaku yang kodenya sudah benar, jadi hijau pada jalan pertama tak
 * membuktikan apa pun. Dekoratornya dicabut satu per satu dan dipulihkan:
 * `GET /surveys/active` menjawab 200, `POST /surveys/:id/responses` menjawab
 * 400, `POST /complaints` menjawab 201 dan BENAR-BENAR membuat dua baris
 * pengaduan di `skm_uji` (dihapus sesudahnya; `audit_logs` tidak disentuh).
 * Setiap kali, hanya dua uji yang bersangkutan memerah dan empat lainnya tetap
 * hijau, jadi tiap uji bergantung pada gerbangnya sendiri.
 *
 * Tak ada fixture di berkas ini, dan itu disengaja. `RolesGuard` berjalan
 * sebelum handler maupun interceptor, sehingga id survei karangan sudah cukup
 * dan `POST /complaints` ditolak sebelum multipart-nya dibaca. Berkas ini tidak
 * menulis satu baris pun ke `skm_uji`.
 */
describe('Matriks TC-RBAC: rute khusus responden (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  const kabupaten = () => devHeaders({ role: Role.kabupaten });
  const opd = () => devHeaders({ role: Role.opd, opdId: 1 });

  const HANYA_RESPONDEN = /hanya untuk peran: responden/i;

  describe('TC-RBAC-008: GET /surveys/active', () => {
    it('Admin Kabupaten ditolak di gerbang peran', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/surveys/active').set(kabupaten());

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(HANYA_RESPONDEN);
    });

    it('Admin OPD ditolak di gerbang peran', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/surveys/active').set(opd());

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(HANYA_RESPONDEN);
    });
  });

  /**
   * Id survei 999999 sengaja tidak ada, dan tak perlu ada: gerbangnya menolak
   * sebelum handler-nya dipanggil. Terukur lewat mutasi -- dengan `@Roles`
   * dicabut, rute ini menjawab 400 dari lapis validasi, bukan 403, sehingga
   * uji ini memerah alih-alih lulus karena sebab yang berbeda.
   */
  describe('TC-RBAC-009: POST /surveys/:surveyId/responses', () => {
    it('Admin Kabupaten ditolak di gerbang peran', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/surveys/999999/responses')
        .set(kabupaten())
        .send({ answers: [] });

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(HANYA_RESPONDEN);
    });

    it('Admin OPD ditolak di gerbang peran', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/surveys/999999/responses')
        .set(opd())
        .send({ answers: [] });

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(HANYA_RESPONDEN);
    });
  });

  describe('TC-RBAC-011: POST /complaints', () => {
    it('Admin Kabupaten ditolak di gerbang peran', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set(kabupaten())
        .field('kategori', 'aduan')
        .field('judul', 'Tak boleh terbuat')
        .field('uraian', 'Permintaan ini harus berhenti di gerbang peran.');

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(HANYA_RESPONDEN);
    });

    it('Admin OPD ditolak di gerbang peran', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set(opd())
        .field('kategori', 'aduan')
        .field('judul', 'Tak boleh terbuat')
        .field('uraian', 'Permintaan ini harus berhenti di gerbang peran.');

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(HANYA_RESPONDEN);
    });
  });
});
