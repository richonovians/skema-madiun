import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { devHeaders } from './helpers/auth.helper';

/**
 * DOKUMEN OPENAPI BER-PENJAGA PERAN (5 Oktober 2026).
 *
 * Endpoint ini sengaja HIDUP DI PRODUKSI, berbeda dari UI Swagger (`/api/docs`)
 * yang wajib mati di sana. Karena itu penjaganya diuji e2e, bukan hanya unit:
 * pembangun dokumennya didaftarkan di `configureApp()`, dan berkas inilah yang
 * membuktikan pendaftaran itu memang terjadi pada jalur yang SAMA dengan
 * produksi. Bila kelak seseorang memindahkannya ke `main.ts` -- yang tidak
 * dipakai e2e -- ketiga uji di bawah akan memerah.
 *
 * Tak ada data yang ditulis: endpoint ini hanya membaca bentuk kode sendiri,
 * jadi suite ini tak punya `afterAll` pembersih dan tak menyentuh `audit_logs`.
 */
describe('Dokumentasi OpenAPI (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Kabupaten -> 200 dan paths tidak kosong', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dokumentasi/openapi')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);
    expect(res.body.data.openapi).toBe('3.0.0');
    // Dokumen kosong terbaca seperti "API ini tak punya endpoint"; itu keadaan
    // yang harus GAGAL, bukan lulus. Angka 40 dipilih di bawah 53 path yang
    // terukur hari ini supaya uji tak pecah setiap kali satu endpoint
    // ditambah atau dibuang.
    expect(Object.keys(res.body.data.paths).length).toBeGreaterThan(40);
  });

  /**
   * PAGAR REDAKSIONAL, dan ia menjaga cacat yang sungguh terjadi.
   *
   * `nest-cli.json` menyalakan `introspectComments: true`, sehingga plugin
   * Swagger menarik SELURUH blok JSDoc sebuah handler ke dalam `summary` --
   * bukan baris pertamanya saja. Diukur 5 Oktober 2026: 20 dari 60 summary
   * membawa blok utuh, yang terpanjang 944 karakter, lengkap dengan tanggal
   * keputusan, nomor temuan audit, nama berkas e2e, dan riwayat bypass yang
   * dibongkar. Itu naskah untuk pemelihara kode, bukan untuk pembaca API.
   *
   * Obatnya bukan memotong di sisi frontend: dokumen yang sama juga disajikan
   * Swagger, jadi memotongnya di tampilan hanya menyembunyikan masalah dari
   * satu pembaca. Yang benar adalah `@ApiOperation({ summary })` tersurat pada
   * handler yang JSDoc-nya panjang. JSDoc-nya sendiri TIDAK dibuang -- dua
   * audiens, dua naskah, masing-masing di tempatnya.
   *
   * Ambang 120 longgar dengan sengaja: yang terpanjang sesudah dibereskan 97
   * karakter, jadi uji ini tak akan rewel pada kalimat yang memang perlu
   * sedikit lebih panjang.
   *
   * JANGKAUAN UJI INI TERBATAS, dan batasnya harus dinyatakan supaya tak ada
   * yang mengira ia menjaga lebih banyak daripada yang sesungguhnya. Plugin
   * `@nestjs/swagger` bekerja saat KOMPILASI lewat Nest CLI; ts-jest tidak
   * menjalankannya. Diukur: dokumen yang dibangun di sini hanya memuat 5
   * summary (yang `@ApiOperation` tersurat) dari 65 operasi, sedang dokumen
   * yang dibangun `nest build` memuat 60. Jadi uji ini menjaga summary yang
   * DITULIS TANGAN tetap ringkas, dan tidak dapat melihat yang diturunkan dari
   * JSDoc sama sekali. Yang menjaga bagian itu adalah
   * `src/modules/dokumentasi/summary-handler.spec.ts`, yang membaca berkas
   * sumbernya langsung.
   */
  it('setiap summary ringkas: satu baris, maksimal 120 karakter', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dokumentasi/openapi')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);

    const BATAS = 120;
    const pelanggar: string[] = [];

    for (const [jalur, butir] of Object.entries(
      res.body.data.paths as Record<string, Record<string, { summary?: string }>>,
    )) {
      for (const [metode, operasi] of Object.entries(butir)) {
        const summary = operasi.summary;
        if (!summary) continue;
        // String.fromCharCode(10) dipakai alih-alih escape agar tak ada
        // garis miring yang bisa tertelan alat penyunting berkas.
        if (summary.includes(String.fromCharCode(10))) {
          pelanggar.push(`${metode.toUpperCase()} ${jalur}: berparagraf (${summary.length} kar.)`);
        } else if (summary.length > BATAS) {
          pelanggar.push(`${metode.toUpperCase()} ${jalur}: ${summary.length} kar.`);
        }
      }
    }

    // Daftar pelanggarnya ikut dicetak: pesan "20 != 0" saja tak memberi tahu
    // berkas mana yang harus disunting.
    expect(pelanggar).toEqual([]);
  });

  /**
   * PERAN DITERBITKAN KE DOKUMEN (6 Oktober 2026).
   *
   * `@Roles` hidup sebagai metadata handler dan tak pernah sampai ke dokumen
   * OpenAPI: diukur sebelum perubahan ini, seluruh dokumen menyebut peran
   * tepat SATU kali, dan itu pun kebetulan dari kalimat ringkasan. Akibatnya
   * pembaca halaman Dokumentasi API baru tahu sebuah endpoint khusus Admin
   * Kabupaten setelah dibalas 403.
   *
   * `anotasiRute` memetakan metadata itu balik ke operasi lewat `operationId`,
   * yang berpola `Controller_method` dan terukur ADA pada 65 dari 65 operasi
   * serta unik. Nol suntingan di controller, jadi anotasinya tak bisa usang --
   * ia membaca penegak yang sesungguhnya.
   *
   * Uji ini JALAN di e2e meski plugin Nest CLI tidak: `paths` dan
   * `operationId` lahir dari registrasi rute, bukan dari pembacaan komentar.
   */
  it('setiap operasi menyatakan perannya atau menyatakan dirinya publik', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dokumentasi/openapi')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);

    const kurang: string[] = [];
    for (const [jalur, butir] of Object.entries(
      res.body.data.paths as Record<string, Record<string, Record<string, unknown>>>,
    )) {
      for (const [metode, operasi] of Object.entries(butir)) {
        const adaPeran = Array.isArray(operasi['x-peran']);
        const adaPublik = operasi['x-publik'] === true;
        if (!adaPeran && !adaPublik) {
          kurang.push(`${metode.toUpperCase()} ${jalur}`);
        }
      }
    }

    expect(kurang).toEqual([]);
  });

  it('mengambil peran dari dekorator tingkat kelas, bukan hanya handler', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dokumentasi/openapi')
      .set(devHeaders({ role: Role.kabupaten }));

    // `UsersController` memasang `@Roles(Role.kabupaten)` di KELASNYA; tak ada
    // satu pun handlernya yang mengulanginya.
    expect(res.body.data.paths['/api/v1/users'].get['x-peran']).toEqual(['kabupaten']);
  });

  it('menandai endpoint @Public tanpa mengarang peran untuknya', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dokumentasi/openapi')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.body.data.paths['/api/v1/health'].get['x-publik']).toBe(true);
  });

  /**
   * Dua endpoint TANPA `@Roles` sama sekali -- isolasinya ditegakkan di service,
   * bukan di guard. Keduanya harus menghasilkan daftar KOSONG, bukan peran
   * karangan: daftar kosong berarti "seluruh peran terautentikasi", dan itulah
   * yang sesungguhnya berlaku.
   */
  it('endpoint tanpa @Roles menghasilkan daftar kosong, bukan peran karangan', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dokumentasi/openapi')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.body.data.paths['/api/v1/complaints'].get['x-peran']).toEqual([]);
  });

  /**
   * Batas laju juga tak pernah terbit. Ada throttle GLOBAL (ttl 60_000,
   * limit 100) sehingga 429 dapat terjadi di mana saja, dan enam handler
   * menimpanya dengan angka sendiri.
   */
  it('menerbitkan batas laju handler yang menimpanya', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dokumentasi/openapi')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(
      res.body.data.paths['/api/v1/surveys/{surveyId}/responses'].post['x-batas-laju'],
    ).toEqual({ limit: 10, ttlMs: 60000 });
    expect(res.body.data.paths['/api/v1/surveys'].get['x-batas-laju']).toBeNull();
  });

  /**
   * Throttle GLOBAL (ttl & limit dari ConfigService) berlaku bagi SEMUA
   * endpoint, jadi 429 dapat terjadi di mana saja. Angkanya diterbitkan di
   * akar dokumen supaya halaman tak perlu menghardcode-nya -- nilai yang
   * dihardcode akan berbohong begitu konfigurasinya diubah.
   */
  it('menerbitkan batas laju global di akar dokumen', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dokumentasi/openapi')
      .set(devHeaders({ role: Role.kabupaten }));

    const global = res.body.data['x-batas-laju-global'];
    expect(typeof global.limit).toBe('number');
    expect(typeof global.ttlMs).toBe('number');
    expect(global.limit).toBeGreaterThan(0);
  });

  it('Admin OPD -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dokumentasi/openapi')
      .set(devHeaders({ role: Role.opd, opdId: 1 }));

    expect(res.status).toBe(403);
  });

  /**
   * TIDAK ADA UJI "tanpa sesi -> 401" di sini, dan itu disengaja.
   *
   * Saya menulisnya lebih dulu dan ia memerah dengan `200`. Penyebabnya bukan
   * cacat: `StubAuthProvider` -- penyedia autentikasi di lingkungan uji --
   * memperlakukan permintaan TANPA header `x-dev-*` apa pun sebagai
   * `kabupaten`. Peringatan itu sudah tertulis tersurat di docblock
   * `stub-auth.provider.ts`: "Uji 'bisa diakses tanpa sesi' tak membuktikan apa
   * pun di lingkungan ini."
   *
   * Jadi uji semacam itu akan hijau atau merah karena bawaan stub, bukan karena
   * gerbangnya. Memaksa `NODE_ENV='development'` akan menukar penyedianya
   * menjadi `SessionAuthProvider` dan justru mematahkan kedua uji di atas, yang
   * memang bersandar pada header dev.
   *
   * Penegakan `@Roles` tetap terbukti oleh uji `403` di atas: itulah gerbang
   * yang ditambahkan endpoint ini. Penolakan permintaan anonim adalah perilaku
   * `RolesGuard` yang sudah ada dan diuji di tempatnya sendiri.
   */
});
