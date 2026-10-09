import configuration from './configuration';

/**
 * GERBANG PRODUKSI SWAGGER UI (9 Oktober 2026).
 *
 * Sebelum ini `SWAGGER_ENABLED` berbawaan `'true'` dan TIDAK melihat
 * `NODE_ENV` sama sekali, sehingga penggelaran yang lupa menyetel satu
 * variabel menyajikan Swagger UI di produksi. Gagal TERBUKA, padahal setiap
 * gerbang lain di repo ini gagal tertutup.
 *
 * Dua naskah yang menyatakan sebaliknya, dan keduanya menyesatkan pembaca
 * berikutnya: CLAUDE.md menyebut `/api/docs` "wajib dimatikan di produksi",
 * dan docblock `gerbang-penyimpanan.ts` mengklaim pola gerbang produksi
 * "sudah dipakai proyek ini pada SWAGGER_ENABLED". Yang terakhir itu klaim
 * atas sifat keamanan yang tak dimiliki kodenya.
 *
 * TANPA PINTU DARURAT di produksi, dan itu pilihan sadar: `main.ts` sendiri
 * menyatakan UI ini HANYA untuk non-produksi, dan yang hidup di produksi
 * adalah endpoint `/dokumentasi/openapi` yang dijaga peran. Sebuah variabel
 * yang dapat membuka UI publik di produksi adalah variabel yang kelak
 * tersetel karena kelalaian.
 */
describe('configuration: gerbang Swagger', () => {
  const envAsli = process.env;

  beforeEach(() => {
    process.env = { ...envAsli };
    delete process.env.SWAGGER_ENABLED;
  });

  afterAll(() => {
    process.env = envAsli;
  });

  it('produksi tanpa SWAGGER_ENABLED -> MATI', () => {
    process.env.NODE_ENV = 'production';

    expect(configuration().swagger.enabled).toBe(false);
  });

  /** Inti pilihannya: di produksi variabel itu tak dapat membukanya. */
  it('produksi dengan SWAGGER_ENABLED=true -> TETAP MATI', () => {
    process.env.NODE_ENV = 'production';
    process.env.SWAGGER_ENABLED = 'true';

    expect(configuration().swagger.enabled).toBe(false);
  });

  it('pengembangan tanpa variabel -> hidup, seperti sebelumnya', () => {
    process.env.NODE_ENV = 'development';

    expect(configuration().swagger.enabled).toBe(true);
  });

  it('pengembangan dengan SWAGGER_ENABLED=false -> dapat dimatikan sendiri', () => {
    process.env.NODE_ENV = 'development';
    process.env.SWAGGER_ENABLED = 'false';

    expect(configuration().swagger.enabled).toBe(false);
  });

  it('nilai yang tak terbaca sebagai "true" -> mati, bukan diloloskan', () => {
    process.env.NODE_ENV = 'development';
    process.env.SWAGGER_ENABLED = 'mungkin';

    expect(configuration().swagger.enabled).toBe(false);
  });
});
