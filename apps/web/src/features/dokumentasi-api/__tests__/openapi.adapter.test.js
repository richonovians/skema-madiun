import { adaptOpenApi } from '../adapters/openapi.adapter';
import { dokumenOpenApi } from '../__fixtures__/openapi.fixture';

describe('adaptOpenApi', () => {
  it('mengelompokkan operasi menurut tag', () => {
    const grup = adaptOpenApi(dokumenOpenApi);

    expect(grup.map((g) => g.tag)).toEqual(['surveys', 'complaints', 'public']);
    expect(grup[0].operasi).toHaveLength(4);
  });

  it('memisahkan parameter path dari query', () => {
    const grup = adaptOpenApi(dokumenOpenApi);
    const detail = grup[0].operasi.find((o) => o.path === '/api/v1/surveys/{id}');

    expect(detail.parameterPath.map((p) => p.nama)).toEqual(['id']);
    expect(detail.parameterQuery).toEqual([]);
  });

  it('membawa enum query sebagai pilihan', () => {
    const grup = adaptOpenApi(dokumenOpenApi);
    const daftar = grup[0].operasi.find((o) => o.metode === 'GET' && o.path === '/api/v1/surveys');
    const status = daftar.parameterQuery.find((p) => p.nama === 'status');

    expect(status.pilihan).toEqual(['draft', 'aktif', 'ditutup']);
    expect(status.wajib).toBe(false);
  });

  /**
   * PAGAR UTAMA berkas ini. Badan permintaan di dokumen sungguhan TIDAK inline,
   * ia `$ref` ke `components.schemas`. Adapter yang tak menyelesaikannya akan
   * menghasilkan `skemaBadan: null` dan snippet POST tanpa badan sama sekali --
   * cacat yang terbaca seperti "endpoint ini memang tak butuh badan".
   */
  it('menyelesaikan $ref badan permintaan ke components.schemas', () => {
    const grup = adaptOpenApi(dokumenOpenApi);
    const buat = grup[0].operasi.find((o) => o.metode === 'POST');

    expect(buat.skemaBadan.wajib).toEqual(['judul', 'periode']);
    expect(buat.skemaBadan.properti.map((p) => p.nama)).toEqual([
      'judul',
      'periode',
      'allowMultipleSubmit',
      'izinkanAnonim',
      'opdId',
    ]);
    expect(buat.skemaBadan.properti.find((p) => p.nama === 'periode').contoh).toBe('2026-Q1');
  });

  /**
   * `description` KOSONG pada SELURUH 65 operasi dokumen sungguhan (terukur 5
   * Oktober 2026). Adapter tak boleh menambalnya dengan ringkasan atau teks
   * karangan -- aturan "adapter tidak mengarang nilai" di apps/web/AGENTS.md.
   */
  it('tidak mengarang deskripsi untuk operasi yang tak punya', () => {
    const grup = adaptOpenApi(dokumenOpenApi);

    for (const op of grup[0].operasi) {
      expect(op.deskripsi).toBeNull();
    }
  });

  /**
   * STATUS SUKSES diambil dari dokumen, tidak ditebak: 61 operasi
   * mendeklarasikan 200 dan 4 mendeklarasikan 201 (terukur 5 Oktober 2026).
   * Menganggap semuanya 200 akan salah pada setiap endpoint pembuat.
   */
  it('membawa status sukses yang dideklarasikan dokumen', () => {
    const op = adaptOpenApi(dokumenOpenApi)[0].operasi;
    expect(op.find((o) => o.metode === 'GET' && o.path === '/api/v1/surveys').statusSukses).toBe(
      200,
    );
    expect(op.find((o) => o.metode === 'POST').statusSukses).toBe(201);
  });

  it('menyelesaikan $ref respons berbentuk array menjadi daftar properti', () => {
    const daftar = adaptOpenApi(dokumenOpenApi)[0].operasi.find(
      (o) => o.metode === 'GET' && o.path === '/api/v1/surveys',
    );

    expect(daftar.skemaRespons.daftar).toBe(true);
    expect(daftar.skemaRespons.properti.map((p) => p.nama)).toEqual([
      'id',
      'opdId',
      'judul',
      'periode',
      'status',
      'allowMultipleSubmit',
      'createdAt',
    ]);
    expect(daftar.skemaRespons.properti.find((p) => p.nama === 'status').pilihan).toEqual([
      'draft',
      'aktif',
      'ditutup',
    ]);
  });

  it('menyelesaikan $ref respons berbentuk objek', () => {
    const detail = adaptOpenApi(dokumenOpenApi)[0].operasi.find(
      (o) => o.path === '/api/v1/surveys/{id}' && o.metode === 'GET',
    );

    expect(detail.skemaRespons.daftar).toBe(false);
    expect(detail.skemaRespons.properti.length).toBeGreaterThan(0);
  });

  /**
   * SEBELAS dari 65 operasi tak mendeklarasikan skema respons sama sekali
   * (terukur 5 Oktober 2026), `DELETE /surveys/{id}` salah satunya. Adapter
   * tak boleh menambalnya dengan bentuk karangan -- aturan "adapter tidak
   * mengarang nilai" di apps/web/AGENTS.md.
   */
  it('tidak mengarang skema respons untuk operasi yang tak punya', () => {
    const hapus = adaptOpenApi(dokumenOpenApi)[0].operasi.find((o) => o.metode === 'DELETE');

    expect(hapus.skemaRespons).toBeNull();
    expect(hapus.statusSukses).toBe(200);
  });

  /**
   * `security` per operasi ADA di dokumen sungguhan: 61 dari 65 membawanya,
   * dan 4 yang tidak memang endpoint publik. Jadi "butuh sesi" adalah
   * kebenaran dokumen, bukan tebakan.
   */
  it('menandai butuh-sesi dari field security milik operasi', () => {
    const grup = adaptOpenApi(dokumenOpenApi);
    const bersesi = grup[0].operasi.find((o) => o.metode === 'GET');
    const publik = grup.find((g) => g.tag === 'public').operasi[0];

    expect(bersesi.butuhSesi).toBe(true);
    expect(publik.butuhSesi).toBe(false);
  });

  /**
   * 106 dari 318 properti dan 41 dari 77 parameter membawa `description` di
   * dokumen sungguhan (terukur 6 Oktober 2026). Semuanya sempat dibuang adapter
   * ini -- termasuk aturan format `periode`, yang TIDAK ada sebagai `pattern`
   * (nol kemunculan di seluruh dokumen) melainkan hanya sebagai keterangan.
   */
  it('membawa keterangan properti badan', () => {
    const buat = adaptOpenApi(dokumenOpenApi)[0].operasi.find((o) => o.metode === 'POST');
    const periode = buat.skemaBadan.properti.find((p) => p.nama === 'periode');

    expect(periode.keterangan).toBe('Format kanonik triwulan: {tahun}-Q{1-4} (D5+D8)');
    expect(buat.skemaBadan.properti.find((p) => p.nama === 'judul').keterangan).toBeNull();
  });

  it('membawa keterangan parameter', () => {
    const daftar = adaptOpenApi(dokumenOpenApi)[0].operasi.find(
      (o) => o.metode === 'GET' && o.path === '/api/v1/surveys',
    );

    expect(daftar.parameterQuery.find((p) => p.nama === 'page').keterangan).toBe(
      'Nomor halaman (mulai dari 1)',
    );
  });

  it('membawa batasan panjang, rentang, dan format', () => {
    const grup = adaptOpenApi(dokumenOpenApi);
    const buat = grup[0].operasi.find((o) => o.metode === 'POST');
    const judul = buat.skemaBadan.properti.find((p) => p.nama === 'judul');

    expect(judul.batasan).toEqual({ minLength: 1, maxLength: 100 });

    const daftar = grup[0].operasi.find((o) => o.metode === 'GET' && o.path === '/api/v1/surveys');
    expect(daftar.parameterQuery.find((p) => p.nama === 'limit').batasan).toEqual({
      minimum: 1,
      maximum: 100,
    });
    expect(
      daftar.skemaRespons.properti.find((p) => p.nama === 'createdAt').batasan,
    ).toEqual({ format: 'date-time' });
  });

  it('properti tanpa batasan menghasilkan objek kosong, bukan null', () => {
    const buat = adaptOpenApi(dokumenOpenApi)[0].operasi.find((o) => o.metode === 'POST');

    expect(buat.skemaBadan.properti.find((p) => p.nama === 'izinkanAnonim').batasan).toEqual({});
  });

  /**
   * BADAN multipart/form-data PUNYA SKEMA, dan skemanya `$ref` ke DTO yang
   * sama lengkapnya dengan badan JSON mana pun. Adapter yang hanya membaca
   * `application/json` melaporkan `POST /complaints` -- endpoint pengajuan
   * pengaduan -- seolah tak butuh mengirim apa pun.
   */
  it('membaca badan multipart, bukan hanya application/json', () => {
    const buat = adaptOpenApi(dokumenOpenApi).find((g) => g.tag === 'complaints').operasi[0];

    expect(buat.jenisBadan).toBe('multipart/form-data');
    expect(buat.skemaBadan.wajib).toEqual(['kategori', 'judul', 'uraian']);
    expect(buat.skemaBadan.properti.map((p) => p.nama)).toContain('uraian');
  });

  it('menandai badan JSON sebagai application/json', () => {
    const buat = adaptOpenApi(dokumenOpenApi)[0].operasi.find((o) => o.metode === 'POST');

    expect(buat.jenisBadan).toBe('application/json');
  });

  it('operasi tanpa badan tak punya jenis badan', () => {
    const daftar = adaptOpenApi(dokumenOpenApi)[0].operasi.find(
      (o) => o.metode === 'GET' && o.path === '/api/v1/surveys',
    );

    expect(daftar.jenisBadan).toBeNull();
  });

  /**
   * `x-peran`, `x-publik`, dan `x-batas-laju` diterbitkan `anotasiRute` di
   * backend dari metadata yang SESUNGGUHNYA ditegakkan `RolesGuard` dan
   * `ThrottlerGuard`. Sebelum itu dokumen menyebut peran tepat satu kali di
   * seluruh 65 operasi, sehingga pembaca baru tahu sebuah endpoint terlarang
   * setelah dibalas 403.
   */
  it('membawa peran, status publik, dan batas laju', () => {
    const grup = adaptOpenApi(dokumenOpenApi);
    const daftar = grup[0].operasi.find((o) => o.metode === 'GET' && o.path === '/api/v1/surveys');
    const buat = grup[0].operasi.find((o) => o.metode === 'POST');
    const publik = grup.find((g) => g.tag === 'public').operasi[0];

    expect(daftar.peran).toEqual(['kabupaten', 'opd']);
    expect(daftar.publik).toBe(false);
    expect(daftar.batasLaju).toBeNull();

    expect(buat.batasLaju).toEqual({ limit: 10, ttlMs: 60000 });
    expect(publik.publik).toBe(true);
  });

  it('membedakan daftar peran kosong dari peran yang tak diterbitkan', () => {
    const detail = adaptOpenApi(dokumenOpenApi)[0].operasi.find(
      (o) => o.metode === 'GET' && o.path === '/api/v1/surveys/{id}',
    );

    // Kosong = tak ada `@Roles`, artinya seluruh peran terautentikasi boleh.
    expect(detail.peran).toEqual([]);
  });

  it('membawa batas laju global dari akar dokumen', () => {
    const grup = adaptOpenApi(dokumenOpenApi);

    expect(grup[0].operasi[0].batasLajuGlobal).toEqual({ limit: 100, ttlMs: 60000 });
  });

  /**
   * 55 dari 61 skema mendeklarasikan `required` (terukur 6 Oktober 2026).
   * Tanpa membawanya, halaman menggambar seluruh medan respons sama rata dan
   * pembaca tak dapat membedakan medan yang PASTI ada dari yang boleh `null`.
   */
  it('membawa daftar medan wajib pada skema respons', () => {
    const daftar = adaptOpenApi(dokumenOpenApi)[0].operasi.find(
      (o) => o.metode === 'GET' && o.path === '/api/v1/surveys',
    );

    expect(daftar.skemaRespons.wajib).toEqual([
      'id',
      'opdId',
      'judul',
      'periode',
      'status',
      'allowMultipleSubmit',
    ]);
    // `createdAt` ada di properti tetapi TIDAK di `required`.
    expect(daftar.skemaRespons.wajib).not.toContain('createdAt');
  });

  it('memberi id stabil per operasi', () => {
    const grup = adaptOpenApi(dokumenOpenApi);
    const id = grup[0].operasi.map((o) => o.id);

    expect(new Set(id).size).toBe(id.length);
    expect(id).toContain('get-/api/v1/surveys');
  });

  it('dokumen tanpa paths menghasilkan daftar kosong, bukan melempar', () => {
    expect(adaptOpenApi({ openapi: '3.0.0' })).toEqual([]);
    expect(adaptOpenApi(null)).toEqual([]);
  });
});
