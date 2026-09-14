import { ConfigService } from '@nestjs/config';
import { TurnstileService } from './turnstile.service';

/**
 * Verifikasi token Turnstile (14 September 2026).
 *
 * Token yang dibawa peramban TIDAK boleh dipercaya begitu saja -- siapa pun
 * dapat mengarangnya. Yang menentukan sah-tidaknya hanya jawaban Cloudflare.
 */
describe('TurnstileService', () => {
  const config = (rahasia: string | undefined, nodeEnv = 'development') =>
    ({
      get: jest.fn((kunci: string) =>
        kunci === 'turnstile.secretKey' ? rahasia : kunci === 'app.nodeEnv' ? nodeEnv : undefined,
      ),
    }) as unknown as ConfigService;

  const fetchPalsu = (hasil: unknown, status = 200) =>
    jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(hasil),
    });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('aktif (rahasia terisi)', () => {
    it('menerima token yang dijawab success oleh Cloudflare', async () => {
      global.fetch = fetchPalsu({ success: true });
      const service = new TurnstileService(config('rahasia-uji'));

      await expect(service.verifikasi('token-sah', '203.0.113.7')).resolves.toBe(true);
    });

    it('menolak token yang dijawab success:false', async () => {
      global.fetch = fetchPalsu({ success: false, 'error-codes': ['invalid-input-response'] });
      const service = new TurnstileService(config('rahasia-uji'));

      await expect(service.verifikasi('token-palsu', '203.0.113.7')).resolves.toBe(false);
    });

    it('mengirim rahasia dan token ke alamat verifikasi Cloudflare', async () => {
      const fetchMock = fetchPalsu({ success: true });
      global.fetch = fetchMock;
      const service = new TurnstileService(config('rahasia-uji'));

      await service.verifikasi('token-sah', '203.0.113.7');

      const [url, opsi] = fetchMock.mock.calls[0] as [string, { body: URLSearchParams }];
      expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
      expect(opsi.body.get('secret')).toBe('rahasia-uji');
      expect(opsi.body.get('response')).toBe('token-sah');
      // IP pengirim ikut dikirim: Cloudflare memakainya untuk menilai token,
      // dan tanpa itu penilaiannya kehilangan sinyal yang paling berguna.
      expect(opsi.body.get('remoteip')).toBe('203.0.113.7');
    });

    /**
     * Cloudflare tak terjangkau. Ditolak, BUKAN diloloskan.
     *
     * Meloloskan saat verifikasi gagal terasa ramah -- warga tetap bisa
     * mengirim -- tetapi artinya captcha-nya mati tanpa seorang pun tahu, dan
     * justru pada saat yang paling mungkin disalahgunakan. Kegagalan yang
     * terlihat jauh lebih baik daripada perlindungan yang diam-diam tiada.
     */
    it('menolak bila Cloudflare tak terjangkau', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const service = new TurnstileService(config('rahasia-uji'));

      await expect(service.verifikasi('token-sah', '203.0.113.7')).resolves.toBe(false);
    });

    it('menolak token kosong tanpa menghubungi Cloudflare', async () => {
      const fetchMock = fetchPalsu({ success: true });
      global.fetch = fetchMock;
      const service = new TurnstileService(config('rahasia-uji'));

      await expect(service.verifikasi('', '203.0.113.7')).resolves.toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('mati (rahasia kosong di luar produksi)', () => {
    it('meloloskan apa pun tanpa menghubungi Cloudflare', async () => {
      const fetchMock = fetchPalsu({ success: false });
      global.fetch = fetchMock;
      const service = new TurnstileService(config(undefined));

      await expect(service.verifikasi('', '203.0.113.7')).resolves.toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    /**
     * Penjaga yang membuat kemudahan di atas tak berubah menjadi lubang.
     * `.env` produksi yang lupa diisi akan MEMATIKAN captcha tanpa satu pun
     * pesan galat -- semuanya tampak normal, dan tak ada yang tahu
     * pelindungnya tidak ada. Karena itu aplikasinya menolak menyala.
     */
    it('menolak dibentuk di produksi tanpa rahasia', () => {
      expect(() => new TurnstileService(config(undefined, 'production'))).toThrow(
        /TURNSTILE_SECRET_KEY/,
      );
    });
  });
});
