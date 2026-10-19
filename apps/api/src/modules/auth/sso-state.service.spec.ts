import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SSO_STATE_COOKIE, SsoStateService, readCookie } from './sso-state.service';
import { SessionService } from './session/session.service';

const SECRET = 'rahasia-uji-hanya-untuk-test';

function buat(nodeEnv = 'test'): { service: SsoStateService; jwt: JwtService } {
  const jwt = new JwtService({ secret: SECRET });
  const config = { get: (key: string) => (key === 'app.nodeEnv' ? nodeEnv : undefined) };
  return { service: new SsoStateService(jwt, config as unknown as ConfigService), jwt };
}

/** Ambil nilai cookie dari header Set-Cookie utuh. */
function nilaiCookie(setCookie: string): string {
  return setCookie.split(';')[0].split('=').slice(1).join('=');
}

describe('SsoStateService', () => {
  describe('issue', () => {
    it('state pada query dan cookie adalah dua nilai BERBEDA yang saling terikat', () => {
      const { service } = buat();
      const { state, setCookie } = service.issue();

      // Nonce mentah dikirim ke Helpdesk; bentuk bertanda-tangannya disimpan di
      // cookie. Kalau keduanya sama, cookie tak menambah pengamanan apa pun.
      expect(nilaiCookie(setCookie)).not.toBe(state);
      expect(state).toMatch(/^[0-9a-f]{64}$/); // 32 byte hex
    });

    it('dua penerbitan menghasilkan state yang berbeda', () => {
      const { service } = buat();
      expect(service.issue().state).not.toBe(service.issue().state);
    });

    it('cookie HttpOnly, SameSite=Lax, path dipersempit ke rute callback', () => {
      const { service } = buat();
      const { setCookie } = service.issue();

      expect(setCookie).toContain('HttpOnly');
      // Lax, BUKAN Strict: callback datang sebagai navigasi lintas-situs dari
      // Helpdesk, dan Strict akan menahan cookie sehingga setiap login gagal.
      expect(setCookie).toContain('SameSite=Lax');
      expect(setCookie).not.toContain('SameSite=Strict');
      expect(setCookie).toContain('Path=/api/v1/auth/sso');
    });

    it('Secure hanya dipasang di production', () => {
      expect(buat('production').service.issue().setCookie).toContain('Secure');
      expect(buat('development').service.issue().setCookie).not.toContain('Secure');
    });
  });

  describe('verify', () => {
    it('pasangan yang benar -> lolos', () => {
      const { service } = buat();
      const { state, setCookie } = service.issue();

      expect(service.verify(state, `${SSO_STATE_COOKIE}=${nilaiCookie(setCookie)}`)).toBe(true);
    });

    it('state pada query DIGANTI penyerang -> ditolak', () => {
      const { service } = buat();
      const { setCookie } = service.issue();

      expect(service.verify('a'.repeat(64), `${SSO_STATE_COOKIE}=${nilaiCookie(setCookie)}`)).toBe(
        false,
      );
    });

    it('tanpa cookie -> ditolak (mis. kedaluwarsa atau tertahan SameSite)', () => {
      const { service } = buat();
      const { state } = service.issue();

      expect(service.verify(state, undefined)).toBe(false);
      expect(service.verify(state, 'cookie_lain=1')).toBe(false);
    });

    it('tanpa state pada query -> ditolak', () => {
      const { service } = buat();
      const { setCookie } = service.issue();

      expect(service.verify(undefined, `${SSO_STATE_COOKIE}=${nilaiCookie(setCookie)}`)).toBe(
        false,
      );
    });

    it('cookie ditandatangani kunci LAIN -> ditolak', () => {
      const { service } = buat();
      const { state } = service.issue();
      const palsu = new JwtService({ secret: 'kunci-penyerang' }).sign({
        typ: 'sso_state',
        n: state,
      });

      expect(service.verify(state, `${SSO_STATE_COOKIE}=${palsu}`)).toBe(false);
    });

    it('cookie kedaluwarsa -> ditolak', () => {
      const { service, jwt } = buat();
      const nonce = 'b'.repeat(64);
      const kedaluwarsa = jwt.sign({ typ: 'sso_state', n: nonce }, { expiresIn: '-1s' });

      expect(service.verify(nonce, `${SSO_STATE_COOKIE}=${kedaluwarsa}`)).toBe(false);
    });

    it('JWT bertanda-tangan sah tapi BUKAN token state -> ditolak', () => {
      const { service, jwt } = buat();
      // Mis. token sesi yang disalin ke tempat cookie state.
      const tokenSesi = jwt.sign({ sub: 7 });

      expect(service.verify('apa pun', `${SSO_STATE_COOKIE}=${tokenSesi}`)).toBe(false);
    });
  });

  describe('clearCookie', () => {
    it('mengosongkan nilai dan Max-Age=0', () => {
      const { service } = buat();
      const header = service.clearCookie();

      expect(header).toContain(`${SSO_STATE_COOKIE}=;`);
      expect(header).toContain('Max-Age=0');
    });
  });

  describe('readCookie', () => {
    it.each([
      ['a=1; sso_state=xyz; b=2', 'xyz'],
      ['sso_state=xyz', 'xyz'],
      ['  sso_state=xyz  ', 'xyz'],
      ['sso_state=a=b', 'a=b'], // JWT tak memuat '=', tapi jangan sampai terpotong
    ])('membaca dari "%s"', (header, harapan) => {
      expect(readCookie(header, SSO_STATE_COOKIE)).toBe(harapan);
    });

    it.each([
      ['', null],
      [undefined, null],
      ['lain=1', null],
      ['sso_state=', null],
      // Nama harus cocok UTUH -- jangan tertipu awalan/akhiran yang mirip.
      ['xsso_state=xyz', null],
      ['sso_state_lain=xyz', null],
    ])('menolak "%s"', (header, harapan) => {
      expect(readCookie(header as string | undefined, SSO_STATE_COOKIE)).toBe(harapan);
    });
  });
});

/**
 * Pengerasan pendamping: sejak state ditandatangani kunci yang SAMA dengan token
 * sesi, SessionService harus menolak JWT sah-tanda-tangan yang bukan token sesi.
 * Tanpa ini, token state yang disalin ke header Authorization berujung pada
 * `findUnique({ where: { id: undefined } })` dan meledak jadi 500.
 */
describe('SessionService.verify menolak token bukan-sesi (2026-08-27)', () => {
  const jwt = new JwtService({ secret: SECRET });
  const session = new SessionService(jwt, {
    get: (kunci: string) => (kunci === 'session.idleMinutes' ? 60 : 12),
  } as unknown as ConfigService);

  it('token sesi normal tetap lolos', () => {
    expect(session.verify(jwt.sign({ sub: 7 }))).toEqual({ sub: 7 });
  });

  it('token state ditolak walau tanda tangannya sah', () => {
    expect(session.verify(jwt.sign({ typ: 'sso_state', n: 'abc' }))).toBeNull();
  });

  it('sub bukan angka ditolak', () => {
    expect(session.verify(jwt.sign({ sub: '7' }))).toBeNull();
  });
});
