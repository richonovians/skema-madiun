/**
 * BUG-058 (29 Oktober 2026): halaman web menyajikan header keamanannya sendiri.
 *
 * Helmet di apps/api hanya menjaga `/api/v1/*`. Halaman HTML dilayani Next.js,
 * dan sebelum ini tak membawa satu pun header keamanan -- tanpa
 * `frame-ancestors`/`X-Frame-Options` halaman mana pun, termasuk halaman admin,
 * dapat dibingkai situs lain -- serta mengumumkan `X-Powered-By: Next.js`.
 *
 * jsdom tak melewati server Next, jadi yang diuji di sini konfigurasinya.
 * Pembuktian di peramban dilakukan terhadap server yang hidup.
 */
const nextConfig = require('../../next.config.js');

const HARAPAN = {
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "frame-ancestors 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

describe('header keamanan halaman web', () => {
  it('tidak mengumumkan X-Powered-By', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('memasang header keamanan pada SEMUA rute', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const aturan = await nextConfig.headers();
    const semuaRute = aturan.find((a) => a.source === '/:path*');

    expect(semuaRute).toBeDefined();
    const header = Object.fromEntries(semuaRute.headers.map((h) => [h.key, h.value]));
    expect(header).toEqual(expect.objectContaining(HARAPAN));
  });
});
