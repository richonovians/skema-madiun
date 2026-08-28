import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SESSION_COOKIE, SessionCookieService } from './session-cookie.service';

const SECRET = 'rahasia-uji-hanya-untuk-test';

function buat(overrides: Record<string, unknown> = {}): {
  service: SessionCookieService;
  jwt: JwtService;
} {
  const jwt = new JwtService({ secret: SECRET });
  const values: Record<string, unknown> = { 'app.nodeEnv': 'test', ...overrides };
  const config = { get: (key: string) => values[key] } as unknown as ConfigService;
  return { service: new SessionCookieService(jwt, config), jwt };
}

/** Ambil atribut Set-Cookie sebagai daftar potongan yang sudah dirapikan. */
function atribut(setCookie: string): string[] {
  return setCookie.split(';').map((part) => part.trim());
}

describe('SessionCookieService', () => {
  describe('build', () => {
    it('menyetel cookie HttpOnly berisi token', () => {
      const { service, jwt } = buat();
      const token = jwt.sign({ sub: 7 }, { expiresIn: '1h' });

      const header = service.build(token);

      expect(header.startsWith(`${SESSION_COOKIE}=${token}`)).toBe(true);
      // Inti keputusan: token tak boleh terbaca JavaScript mana pun di halaman.
      expect(atribut(header)).toContain('HttpOnly');
    });

    it('Path=/ (bukan dipersempit seperti cookie state) supaya ikut di SETIAP panggilan API', () => {
      const { service, jwt } = buat();
      expect(atribut(service.build(jwt.sign({ sub: 1 })))).toContain('Path=/');
    });

    it('SameSite=Lax, BUKAN Strict', () => {
      const { service, jwt } = buat();
      const parts = atribut(service.build(jwt.sign({ sub: 1 })));

      // Strict akan menahan cookie pada callback (navigasi lintas-situs dari
      // Helpdesk) sehingga SETIAP login gagal.
      expect(parts).toContain('SameSite=Lax');
      expect(parts).not.toContain('SameSite=Strict');
    });

    it('Secure hanya di production', () => {
      const { service: prod, jwt } = buat({ 'app.nodeEnv': 'production' });
      const { service: dev } = buat({ 'app.nodeEnv': 'development' });
      const token = jwt.sign({ sub: 1 });

      expect(atribut(prod.build(token))).toContain('Secure');
      // Di dev frontend berjalan di http://localhost -- `Secure` akan membuat
      // cookie tak pernah tersimpan sama sekali.
      expect(atribut(dev.build(token))).not.toContain('Secure');
    });

    it('Domain hanya dipasang bila dikonfigurasi', () => {
      const { service: tanpa, jwt } = buat();
      const { service: dengan } = buat({ 'session.cookieDomain': '.madiunkab.go.id' });
      const token = jwt.sign({ sub: 1 });

      expect(tanpa.build(token)).not.toContain('Domain=');
      expect(atribut(dengan.build(token))).toContain('Domain=.madiunkab.go.id');
    });

    it('Max-Age mengikuti klaim exp TOKEN, bukan hitungan terpisah', () => {
      const { service, jwt } = buat();
      const header = service.build(jwt.sign({ sub: 1 }, { expiresIn: 3600 }));

      const maxAge = Number(
        atribut(header)
          .find((p) => p.startsWith('Max-Age='))
          ?.slice('Max-Age='.length),
      );
      // Selisih detik terhadap 3600 boleh, tapi tak boleh jauh -- yang diuji di
      // sini adalah sumbernya token, bukan `session.ttlHours` yang bisa berbeda.
      expect(maxAge).toBeGreaterThan(3590);
      expect(maxAge).toBeLessThanOrEqual(3600);
    });

    it('token yang SUDAH kedaluwarsa tetap menghasilkan Max-Age positif', () => {
      const { service, jwt } = buat();
      const header = service.build(jwt.sign({ sub: 1 }, { expiresIn: '-1h' }));

      // Max-Age negatif akan diperlakukan peramban sebagai "hapus sekarang",
      // dan cookie yang langsung hilang jauh lebih membingungkan daripada 401
      // yang jujur dari token kedaluwarsanya sendiri.
      expect(atribut(header)).toContain('Max-Age=1');
    });
  });

  describe('clear', () => {
    it('mengosongkan nilai & Max-Age=0', () => {
      const { service } = buat();
      const parts = atribut(service.clear());

      expect(parts).toContain(`${SESSION_COOKIE}=`);
      expect(parts).toContain('Max-Age=0');
    });

    it('mengulang Domain — tanpa itu peramban tak menghapus cookie yang benar', () => {
      const { service } = buat({ 'session.cookieDomain': '.madiunkab.go.id' });
      expect(atribut(service.clear())).toContain('Domain=.madiunkab.go.id');
    });

    it('mengulang Path — cookie dihapus per (nama, domain, path)', () => {
      const { service } = buat();
      expect(atribut(service.clear())).toContain('Path=/');
    });
  });

  describe('read', () => {
    it.each([
      [`${SESSION_COOKIE}=abc`, 'abc'],
      [`role=opd; ${SESSION_COOKIE}=abc; area=opd`, 'abc'],
      ['token=abc', null], // cookie dev-login, BUKAN cookie sesi SSO
      [undefined, null],
    ])('membaca dari %s', (header, harapan) => {
      const { service } = buat();
      expect(service.read(header as string | undefined)).toBe(harapan);
    });
  });

  describe('expiresAt', () => {
    it('mengembalikan klaim exp apa adanya', () => {
      const { service, jwt } = buat();
      const token = jwt.sign({ sub: 1 }, { expiresIn: 3600 });
      const exp = (jwt.decode(token) as { exp: number }).exp;

      expect(service.expiresAt(token)).toBe(exp);
    });

    it('token tanpa exp → memakai nilai cadangan di masa depan, bukan NaN', () => {
      const { service, jwt } = buat();
      const tanpaExp = jwt.sign({ sub: 1 }, { noTimestamp: true });

      const hasil = service.expiresAt(tanpaExp);
      expect(Number.isFinite(hasil)).toBe(true);
      expect(hasil).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('nilai bukan token → nilai cadangan, tidak melempar', () => {
      const { service } = buat();
      expect(() => service.expiresAt('bukan-jwt')).not.toThrow();
      expect(service.expiresAt('bukan-jwt')).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });
});
