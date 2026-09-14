import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * Penghitung batas laju jalur publik dipisah PER SURVEI (14 September 2026).
 *
 * Sebelumnya satu penghitung 20/menit per IP menaungi seluruh survei publik
 * sekaligus. Akibatnya membanjiri satu survei ikut menghabiskan jatah survei
 * lain: penyerang yang menyasar survei Puskesmas dapat menutup pengisian survei
 * Pendidikan bagi warga di jaringan yang sama, tanpa menyentuhnya sama sekali.
 *
 * Ini TIDAK mengurangi banjir pada survei yang disasar -- batas per IP memang
 * tak dapat membedakan loket ramai dari bot, dan itu pekerjaan captcha. Yang
 * dipersempit di sini adalah radius ledakannya.
 *
 * Diuji lewat sisa kuota, bukan dengan menghabiskan 20 permintaan: yang
 * dipersoalkan kunci embernya, bukan besarnya.
 */
describe('Batas laju jalur publik dipisah per survei (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Id survei yang pasti tak ada -> 404 tanpa menulis apa pun ke basis data.
   * ThrottlerGuard menghitung permintaan SEBELUM handler berjalan, jadi 404 pun
   * tetap memakai kuota -- dan itu justru yang sedang diukur.
   *
   * TANPA header `x-dev-*`: rute ini @Public, dan penghitungnya memang harus
   * jatuh ke jalur IP seperti pengunjung sungguhan tanpa sesi.
   */
  const bukaSurvei = async (surveyId: number, ip: string) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/public/surveys/${surveyId}/fill`)
      .set('X-Forwarded-For', ip);
    return Number(res.headers['x-ratelimit-remaining']);
  };

  it('membanjiri satu survei tidak menghabiskan jatah survei lain', async () => {
    const ip = '203.0.113.101';

    const pertama = await bukaSurvei(999991, ip);
    const kedua = await bukaSurvei(999991, ip);
    // Prasyarat: penghitungnya memang berjalan untuk survei yang sama.
    expect(kedua).toBe(pertama - 1);

    const surveiLain = await bukaSurvei(999992, ip);

    expect(surveiLain).toBe(pertama);
  });

  /**
   * Kendali. Pemisahan yang kebablasan -- misalnya ikut memasukkan sesuatu yang
   * berbeda tiap permintaan ke dalam kuncinya -- menghasilkan penghitung yang
   * selalu baru, yaitu tak ada batas sama sekali.
   */
  it('survei yang sama dari IP yang sama tetap satu penghitung', async () => {
    const ip = '203.0.113.102';

    const pertama = await bukaSurvei(999993, ip);
    const kedua = await bukaSurvei(999993, ip);
    const ketiga = await bukaSurvei(999993, ip);

    expect(kedua).toBe(pertama - 1);
    expect(ketiga).toBe(pertama - 2);
  });
});
